// lib/saga-state-types.ts — Saga state 영속 인터페이스 (Cycle 3 B2 — 50줄 룰 분리)
// SagaRow / SagaStateStore 만 단독. impl은 saga-state-memory.ts / saga-state-sqlite.ts.
import type { SagaStatus, SagaStep } from '@/repositories/interfaces/IPersistOrchestrator';

export interface SagaRow {
  id: string;
  idempotencyKey: string;
  status: SagaStatus;
  currentStep: SagaStep;
  payload: string; // JSON
  sideEffects: string; // JSON: { s3Keys: string[], airtableId?: string }
  createdAt: string;
  updatedAt: string;
}

export interface SagaStateStore {
  upsert(row: SagaRow): void;
  update(id: string, patch: Partial<SagaRow>): void;
  get(id: string): SagaRow | null;
  byIdempotencyKey(key: string): SagaRow | null;
  listIncomplete(): SagaRow[];
  /**
   * Cycle 3 Fix (F4, 🟠-3): time-window 기반 health 평가.
   *   - failedRecent: 최근 windowMs 동안 status='failed' 또는 'compensated'로 마감된 saga 수
   *   - inflightStuck: updatedAt이 windowMs 이전인 'running'/'pending' saga 수 (멈춤 의심)
   *   fixed-threshold (incomplete < 5)는 30일 누적 시 false-down 위험 → 시간 윈도우로 교체.
   */
  countRecent(windowMs: number, nowMs?: number): { failedRecent: number; inflightStuck: number };
  close(): void;
}
