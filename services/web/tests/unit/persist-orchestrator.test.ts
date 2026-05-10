import { describe, it, expect, beforeEach } from 'vitest';
import { PersistOrchestrator } from '@/services/persist-orchestrator';
import { createSagaStore, type SagaStateStore } from '@/lib/saga-state';
import { FakeBlobStorage, FakeCarouselRepo, FakeLlmGateway, FakeRenderGateway } from '@/repositories/fakes';
import type { PersistInput } from '@/repositories/interfaces/IPersistOrchestrator';
import { newUUID } from '@/types/foundation';

function deps() {
  const llm = new FakeLlmGateway();
  const render = new FakeRenderGateway();
  const blob = new FakeBlobStorage();
  const carousels = new FakeCarouselRepo();
  const state: SagaStateStore = createSagaStore();
  const orch = new PersistOrchestrator({ llm, render, blob, carousels, state });
  return { llm, render, blob, carousels, state, orch };
}

const baseInput = (key = 'idem-1'): PersistInput => ({
  sessionId: newUUID(), templateId: 'tpl-1', ratio: '1:1', platform: 'instagram',
  slides: [{ index: 0, title: 't', body: 'b' }, { index: 1, title: 't2', body: 'b2' }],
  watermark: true, idempotencyKey: key,
});

// fetch는 upload 내부에서 png URL 다운로드용 — 테스트 시 ArrayBuffer stub.
beforeEach(() => {
  globalThis.fetch = (async () => new Response(new ArrayBuffer(8))) as typeof fetch;
});

describe('PersistOrchestrator', () => {
  it('happy path: validate→render→upload→caption→save returns success', async () => {
    const { orch, carousels, blob } = deps();
    const r = await orch.persist(baseInput());
    expect(r.status).toBe('success');
    expect(r.carousel?.id).toBeDefined();
    expect(carousels.saved.length).toBe(1);
    expect(blob.uploaded.length).toBe(2);
  });

  it('idempotency: same key returns cached result without re-running', async () => {
    const { orch, carousels } = deps();
    const i = baseInput('SAME-KEY');
    await orch.persist(i);
    await orch.persist(i);
    expect(carousels.saved.length).toBe(1);
  });

  it('render failure: returns partial with retryToken (no s3 to compensate)', async () => {
    const d = deps(); d.render.failRender = true;
    const r = await d.orch.persist(baseInput());
    expect(r.status).toBe('partial');
    expect(r.failedAt).toBe('render');
    expect(r.retryToken).toBeDefined();
  });

  it('caption failure: compensates uploaded blobs (S3 delete)', async () => {
    const d = deps(); d.llm.failCaption = true;
    const r = await d.orch.persist(baseInput());
    expect(r.status).toBe('partial');
    expect(r.failedAt).toBe('caption');
    expect(d.blob.deleted.length).toBe(2);
  });

  it('validate failure (no slides) → partial', async () => {
    const d = deps();
    const r = await d.orch.persist({ ...baseInput(), slides: [] });
    expect(r.status).toBe('partial');
    expect(r.failedAt).toBe('validate');
  });

  it('recoverIncomplete marks unrecoverable rows as failed (empty payload → orphan)', async () => {
    const d = deps();
    d.state.upsert({
      id: 'inflight', idempotencyKey: 'old', status: 'running', currentStep: 'render',
      payload: '{}', sideEffects: '{"s3Keys":[]}',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    });
    const r = await d.orch.recoverIncomplete();
    expect(r.orphaned).toBe(1);
    // empty payload → validate throws → compensate → 'compensated' or 'failed'.
    const finalStatus = d.state.get('inflight')?.status;
    expect(['failed', 'compensated']).toContain(finalStatus);
  });

  // Cycle 3 (A2) 박제: replay가 정확히 'render' step부터 다시 실행 → success.
  it('🆕 A2 step replay: incomplete saga at render replays full flow → success', async () => {
    const d = deps();
    const i = baseInput('REPLAY-KEY');
    d.state.upsert({
      id: 'replay-1', idempotencyKey: i.idempotencyKey, status: 'running', currentStep: 'render',
      payload: JSON.stringify(i), sideEffects: '{"s3Keys":[]}',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    });
    const r = await d.orch.recoverIncomplete();
    expect(r.recovered).toBe(1);
    expect(r.orphaned).toBe(0);
    expect(d.state.get('replay-1')?.status).toBe('completed');
    expect(d.carousels.saved.length).toBe(1);
  });

  // Cycle 3 (A2): retry token으로 정확히 step부터 재실행.
  it('🆕 A2 retry preserves prior s3Keys (no double-upload)', async () => {
    const d = deps();
    const i = baseInput('RETRY-KEY');
    d.state.upsert({
      id: 'retry-1', idempotencyKey: i.idempotencyKey, status: 'running', currentStep: 'caption',
      payload: JSON.stringify(i),
      sideEffects: JSON.stringify({ s3Keys: ['carousels/retry-1/0.png', 'carousels/retry-1/1.png'] }),
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    });
    const r = await d.orch.retry('retry-1');
    expect(r.status).toBe('success');
    // upload-blob 재실행 안 함 → blob.uploaded 빈 채로.
    expect(d.blob.uploaded.length).toBe(0);
    // carousel 저장됨 + 보존된 s3Keys 사용.
    expect(d.carousels.saved.length).toBe(1);
    expect(d.carousels.saved[0]!.s3Urls.length).toBe(2);
  });

  // Cycle 2 Fix (F4, 🟠-5) 박제: 같은 idempotencyKey의 동시 호출이 단일 saga row만 생성.
  it('🟠-5 in-flight dedup: concurrent persist with same key → single saga, single carousel', async () => {
    const d = deps();
    const i = baseInput('CONCURRENT-KEY');
    const [r1, r2, r3] = await Promise.all([d.orch.persist(i), d.orch.persist(i), d.orch.persist(i)]);
    expect(r1.status).toBe('success');
    expect(r2.status).toBe('success');
    expect(r3.status).toBe('success');
    // 단일 carousel + 단일 upload set (S3 orphan 0).
    expect(d.carousels.saved.length).toBe(1);
    expect(d.blob.uploaded.length).toBe(2); // baseInput에 슬라이드 2개
  });

  // Cycle 3 Fix (F1, 🟠-1) 박제: 다중 instance(orchestrator 2개) 가 같은 saga store(=DB)를
  //   공유할 때, 각각 in-flight Map은 빈 채로 동일 key 동시 호출 → DB UNIQUE INSERT OR IGNORE
  //   가 1 row만 통과 + post-upsert reread 검증으로 race loser는 winner saga로 redirect.
  //   결과: 단일 carousel + 단일 upload set.
  it('🆕 F1 multi-instance race: two orchestrators share state, same key → single carousel', async () => {
    // 공유 state + 공유 sink fakes (다중 instance가 동일 외부 자원에 영향)
    const llm = new FakeLlmGateway();
    const render = new FakeRenderGateway();
    const blob = new FakeBlobStorage();
    const carousels = new FakeCarouselRepo();
    const state: SagaStateStore = createSagaStore();
    const orchA = new PersistOrchestrator({ llm, render, blob, carousels, state });
    const orchB = new PersistOrchestrator({ llm, render, blob, carousels, state });
    const i = baseInput('MULTI-INSTANCE-KEY');
    const [rA, rB] = await Promise.all([orchA.persist(i), orchB.persist(i)]);
    // 둘 다 의미 있는 응답 (success or partial-redirect-to-winner).
    expect(['success', 'partial', 'orphan']).toContain(rA.status);
    expect(['success', 'partial', 'orphan']).toContain(rB.status);
    // 핵심: carousel 단 1건. 이중 발행 0.
    expect(carousels.saved.length).toBe(1);
    // 업로드도 단 1 set (slide 2개).
    expect(blob.uploaded.length).toBe(2);
  });
});
