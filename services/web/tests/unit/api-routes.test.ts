// API routes integration test (mocked container via setContainer).
import { describe, it, expect, beforeEach } from 'vitest';
import { setContainer, type Container } from '@/lib/container';
import { createSagaStore } from '@/lib/saga-state';
import {
  FakeBlobStorage, FakeCarouselRepo, FakeElementRepo, FakeKnowledgeRepo,
  FakeLlmGateway, FakeRenderGateway, FakeTemplateRepo,
} from '@/repositories/fakes';
import { PersistOrchestrator } from '@/services/persist-orchestrator';
import { newUUID } from '@/types/foundation';

function buildFakeContainer(): Container {
  const llm = new FakeLlmGateway();
  const render = new FakeRenderGateway();
  const blob = new FakeBlobStorage();
  const carousels = new FakeCarouselRepo();
  const sagaState = createSagaStore();
  const persist = new PersistOrchestrator({ llm, render, blob, carousels, state: sagaState });
  return {
    knowledge: new FakeKnowledgeRepo(),
    templates: new FakeTemplateRepo([{ id: 't1' as never, name: 'T1', description: '', ratios: ['1:1'], tags: [] }]),
    carousels, elements: new FakeElementRepo(), blob, llm, render, persist, sagaState,
  };
}

beforeEach(() => {
  setContainer(buildFakeContainer());
  globalThis.fetch = (async () => new Response(new ArrayBuffer(8))) as typeof fetch;
});

describe('API routes (BFF)', () => {
  it('GET /api/templates returns items', async () => {
    const { GET } = await import('@/app/api/templates/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.items.length).toBe(1);
  });

  it('POST /api/render returns 400 on bad body', async () => {
    const { POST } = await import('@/app/api/render/route');
    const req = new Request('http://x/api/render', { method: 'POST', body: '{}' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('POST /api/save runs Saga end-to-end (success)', async () => {
    const { POST } = await import('@/app/api/save/route');
    const body = {
      sessionId: newUUID(), templateId: 't1', ratio: '1:1', platform: 'instagram',
      slides: [{ index: 0, title: 't', body: 'b' }], idempotencyKey: 'K1-12345678',
    };
    const req = new Request('http://x/api/save', { method: 'POST', body: JSON.stringify(body) });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.status).toBe('success');
    expect(j.carousel?.id).toBeDefined();
  });

  // Cycle 2 Fix (F2, 🟠-1) 박제: zod 거절 시 400 + userMessage.
  it('POST /api/save returns 400 with Korean userMessage on invalid enum', async () => {
    const { POST } = await import('@/app/api/save/route');
    const body = {
      sessionId: newUUID(), templateId: 't1', ratio: 'WRONG_RATIO', platform: 'NOT_PLATFORM',
      slides: [{ index: 0, title: 't', body: 'b' }], idempotencyKey: 'K-12345678',
    };
    const req = new Request('http://x/api/save', { method: 'POST', body: JSON.stringify(body) });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.userMessage).toMatch(/요청 형식이 올바르지 않습니다/);
    expect(Array.isArray(j.fields)).toBe(true);
  });

  // Cycle 2 Fix (F2, 🟠-2) 박제: render route invalid enum 400.
  it('POST /api/render returns 400 on invalid ratio', async () => {
    const { POST } = await import('@/app/api/render/route');
    const body = { templateId: 't', ratio: 'BAD', slides: [{ index: 0, title: 't', body: 'b' }] };
    const req = new Request('http://x/api/render', { method: 'POST', body: JSON.stringify(body) });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('POST /api/save/retry returns 503 for unknown token', async () => {
    const { POST } = await import('@/app/api/save/retry/route');
    const req = new Request('http://x/api/save/retry', { method: 'POST', body: JSON.stringify({ retryToken: 'nope' }) });
    const res = await POST(req as never);
    expect(res.status).toBe(503);
  });

  it('GET /api/health/deps returns 9-light shape', async () => {
    const { GET } = await import('@/app/api/health/deps/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const j = await res.json();
    for (const k of ['web', 'llm', 'render', 'storage'] as const) {
      expect(j[k]).toMatchObject({ status: expect.any(String), responseMs: expect.any(Number) });
    }
    for (const k of ['anthropic', 'airtable', 's3', 'gemini'] as const) {
      expect(j.external[k]).toMatchObject({ status: expect.any(String), responseMs: expect.any(Number) });
    }
  });
});
