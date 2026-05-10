// services/persist-orchestrator.ts — Saga 5-step + 보상 (SERVICE-web.md §5-3)
// Cycle 2 Fix (F4, 🟠-5): in-flight idempotency dedup (in-process Map).
// Cycle 3 (A2): recoverIncomplete가 currentStep 기반 정밀 step replay.
// Cycle 3 (B2 50줄 룰): step loop는 persist-orchestrator-runner.ts로 분리.
// Cycle 3 Fix (F1, 🟠-1): in-process Map dedup 위에 DB-level INSERT OR IGNORE
//   + race-after-upsert 검증으로 다중 instance race close. UNIQUE 제약이
//   사용자가 누구든 단 1개 row만 살아남도록 보장 → loser는 winner row의
//   id로 redirect (existing-row branch 따라감).
import type {
  IPersistOrchestrator, PersistInput, PersistResult, SagaStep,
} from '@/repositories/interfaces/IPersistOrchestrator';
import type { SagaRow, SagaStateStore } from '@/lib/saga-state-types';
import { newUUID, nowIso } from '@/types/foundation';
import { type StepDeps, stepIndex } from './persist-orchestrator-steps';
import { runFromStep } from './persist-orchestrator-runner';
import { logger } from '@/lib/logger';

interface Deps extends StepDeps { state: SagaStateStore }

export class PersistOrchestrator implements IPersistOrchestrator {
  // 🟠-5 박제: 같은 idempotencyKey의 in-flight Promise를 메모리 dedup.
  //   다중 instance 환경에서는 UNIQUE 제약 + post-upsert 검증으로 보강 (F1).
  private readonly inflight = new Map<string, Promise<PersistResult>>();
  constructor(private readonly deps: Deps) {}

  async recoverIncomplete(): Promise<{ recovered: number; orphaned: number }> {
    const incomplete = this.deps.state.listIncomplete();
    let recovered = 0; let orphaned = 0;
    for (const row of incomplete) {
      try {
        const r = await this.replayFrom(row, JSON.parse(row.payload) as PersistInput);
        if (r.status === 'success') recovered++; else orphaned++;
      } catch {
        this.deps.state.update(row.id, { status: 'failed' }); orphaned++;
      }
    }
    return { recovered, orphaned };
  }

  async persist(input: PersistInput): Promise<PersistResult> {
    const existingInflight = this.inflight.get(input.idempotencyKey);
    if (existingInflight) return existingInflight;
    const existing = this.deps.state.byIdempotencyKey(input.idempotencyKey);
    const result = this.existingToResult(existing);
    if (result) return result;
    // F1 (🟠-1): UNIQUE INSERT OR IGNORE + post-upsert reread → 다중 instance race close.
    //   동시 다중 호출이 동일 idempotencyKey로 진입해도 DB UNIQUE가 1건만 통과시킴.
    //   loser는 winner row를 다시 읽어 redirect — 새 saga 생성 X → 이중 실행 0.
    const id = newUUID();
    this.deps.state.upsert({
      id, idempotencyKey: input.idempotencyKey, status: 'running', currentStep: 'validate',
      payload: JSON.stringify(input), sideEffects: JSON.stringify({ s3Keys: [] }),
      createdAt: nowIso(), updatedAt: nowIso(),
    });
    const winner = this.deps.state.byIdempotencyKey(input.idempotencyKey);
    if (!winner || winner.id !== id) {
      // 다른 호출이 winner — 우리는 race loser. winner 상태에 따라 응답.
      logger.info({ idempotencyKey: input.idempotencyKey, winnerId: winner?.id, loserId: id },
        'persist: race loser — redirecting to winner saga');
      const winnerResult = this.existingToResult(winner);
      return winnerResult ?? { status: 'orphan', orphanQueueId: id };
    }
    const promise = this.run(id, input, 0, []).finally(() => {
      this.inflight.delete(input.idempotencyKey);
    });
    this.inflight.set(input.idempotencyKey, promise);
    return promise;
  }

  /** 기존 row를 idempotent 응답으로 매핑 — 같은 key 두 번째 호출이 항상 같은 결과를 받게 한다.
   *  - completed → success (carousel) 또는 orphan (carousel deleted).
   *  - running → partial (실시간 진행 중).
   *  - compensated/failed → partial (재시도 가능 retryToken 반환). 이전엔 새 saga 시도 후 race-loser orphan
   *    이었지만 사용자 입장에서는 동일 idempotencyKey가 동일 응답을 받아야 idempotent.
   *  - null → null (caller가 새 saga 시작).
   */
  private existingToResult(row: SagaRow | null): Promise<PersistResult> | PersistResult | null {
    if (!row) return null;
    if (row.status === 'completed') return this.completedToResult(row);
    if (row.status === 'running') {
      return { status: 'partial', failedAt: row.currentStep, retryToken: row.id };
    }
    if (row.status === 'compensated' || row.status === 'failed') {
      return { status: 'partial', failedAt: row.currentStep, retryToken: row.id };
    }
    return null;
  }

  private async completedToResult(row: SagaRow): Promise<PersistResult> {
    const sideEffects = JSON.parse(row.sideEffects) as { airtableId?: string };
    const carousel = sideEffects.airtableId
      ? await this.deps.carousels.get(sideEffects.airtableId as never) : null;
    return carousel ? { status: 'success', carousel } : { status: 'orphan', orphanQueueId: row.id };
  }

  async retry(retryToken: string): Promise<PersistResult> {
    const row = this.deps.state.get(retryToken);
    if (!row) return { status: 'orphan', orphanQueueId: retryToken };
    return this.replayFrom(row, JSON.parse(row.payload) as PersistInput);
  }

  /** Cycle 3 A2: SagaRow → 정확한 step부터 재실행 + 보존된 sideEffects (s3Keys) 활용. */
  private replayFrom(row: SagaRow, input: PersistInput): Promise<PersistResult> {
    const sideEffects = JSON.parse(row.sideEffects) as { s3Keys: string[]; airtableId?: string };
    return this.run(row.id, input, stepIndex(row.currentStep), sideEffects.s3Keys ?? []);
  }

  private run(id: string, input: PersistInput, fromIdx: number, prevS3Keys: string[]): Promise<PersistResult> {
    return runFromStep(this.deps, id, input, fromIdx, prevS3Keys, (sid, keys, err) => this.compensate(sid, keys, err));
  }

  private async compensate(id: string, s3Keys: string[], _err: unknown): Promise<PersistResult> {
    const row = this.deps.state.get(id);
    const failedAt = (row?.currentStep ?? 'validate') as SagaStep;
    let compensatedAll = true;
    for (const k of s3Keys) {
      try { await this.deps.blob.delete(k); } catch { compensatedAll = false; }
    }
    this.deps.state.update(id, { status: compensatedAll ? 'compensated' : 'failed' });
    if (!compensatedAll) return { status: 'orphan', orphanQueueId: id, failedAt };
    return { status: 'partial', failedAt, retryToken: id };
  }
}
