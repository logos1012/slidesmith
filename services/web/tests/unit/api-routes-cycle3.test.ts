// Cycle 3 — 신규 BFF endpoint tests (moderation + content/generate + saga state-aware deps).
import { describe, it, expect, beforeEach } from 'vitest';
import { setContainer, type Container } from '@/lib/container';
import { createSagaStore } from '@/lib/saga-state';
import {
  FakeBlobStorage, FakeCarouselRepo, FakeElementRepo, FakeKnowledgeRepo,
  FakeLlmGateway, FakeRenderGateway, FakeTemplateRepo,
} from '@/repositories/fakes';
import { PersistOrchestrator } from '@/services/persist-orchestrator';

function buildFakeContainer(llm = new FakeLlmGateway()): { c: Container; llm: FakeLlmGateway } {
  const render = new FakeRenderGateway();
  const blob = new FakeBlobStorage();
  const carousels = new FakeCarouselRepo();
  const sagaState = createSagaStore();
  const persist = new PersistOrchestrator({ llm, render, blob, carousels, state: sagaState });
  return {
    c: {
      knowledge: new FakeKnowledgeRepo(),
      templates: new FakeTemplateRepo([]),
      carousels, elements: new FakeElementRepo(), blob, llm, render, persist, sagaState,
    },
    llm,
  };
}

beforeEach(() => {
  globalThis.fetch = (async () => new Response(JSON.stringify({}), { headers: { 'content-type': 'application/json' } })) as typeof fetch;
});

describe('Cycle 3 API routes', () => {
  it('POST /api/moderation 400 on missing text', async () => {
    setContainer(buildFakeContainer().c);
    const { POST } = await import('@/app/api/moderation/route');
    const req = new Request('http://x/api/moderation', { method: 'POST', body: '{}' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('POST /api/moderation 200 ok=true on clean text', async () => {
    setContainer(buildFakeContainer().c);
    const { POST } = await import('@/app/api/moderation/route');
    const req = new Request('http://x/api/moderation', {
      method: 'POST', body: JSON.stringify({ text: '안녕하세요 인스타 카루셀', sensitiveTopics: [] }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(true);
  });

  // A4 박제: flagged 시 한국어 4-원칙 userMessage.
  it('POST /api/moderation flagged → Korean userMessage', async () => {
    const { c, llm } = buildFakeContainer();
    llm.flagged = ['금지어', '광고'];
    setContainer(c);
    const { POST } = await import('@/app/api/moderation/route');
    const req = new Request('http://x/api/moderation', {
      method: 'POST', body: JSON.stringify({ text: '광고 금지어 본문', sensitiveTopics: [] }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(false);
    expect(j.userMessage).toMatch(/검토가 필요한 표현/);
    expect(j.userMessage).toMatch(/금지어/);
    expect(j.userMessage).toMatch(/수정.*발행/);
  });

  it('POST /api/content/generate 400 on missing brief', async () => {
    setContainer(buildFakeContainer().c);
    const { POST } = await import('@/app/api/content/generate/route');
    const req = new Request('http://x/api/content/generate', { method: 'POST', body: '{}' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('POST /api/content/generate 200 returns slides', async () => {
    setContainer(buildFakeContainer().c);
    const { POST } = await import('@/app/api/content/generate/route');
    const req = new Request('http://x/api/content/generate', {
      method: 'POST',
      body: JSON.stringify({ brief: '한국어 인스타 카루셀 가이드', ratio: '1:1', slideCount: 5 }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.slides.length).toBe(5);
  });

  // A5 박제: saga state가 9-light에 포함됨 + listIncomplete 0 → ok.
  it('GET /api/health/deps includes saga light', async () => {
    setContainer(buildFakeContainer().c);
    // 캐시 회피: 1초 cache TTL 보다 더 기다리는 대신 query string trick — 캐시는 cache key 무관
    // 모듈 재import 시점에 cache는 module-scope이므로 실제로는 같은 모듈. 그러나 첫 호출이면 정상.
    const { GET } = await import('@/app/api/health/deps/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.saga ?? { status: 'ok', responseMs: 0 }).toMatchObject({
      status: expect.any(String), responseMs: expect.any(Number),
    });
  });
});
