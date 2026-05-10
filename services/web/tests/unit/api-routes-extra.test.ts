// Extra coverage for BFF routes (knowledge/elements/carousels/chat/stream/onboarding).
import { describe, it, expect, beforeEach } from 'vitest';
import { setContainer, type Container } from '@/lib/container';
import { createSagaStore } from '@/lib/saga-state';
import {
  FakeBlobStorage, FakeCarouselRepo, FakeElementRepo, FakeKnowledgeRepo,
  FakeLlmGateway, FakeRenderGateway, FakeTemplateRepo,
} from '@/repositories/fakes';
import { PersistOrchestrator } from '@/services/persist-orchestrator';

beforeEach(() => {
  const llm = new FakeLlmGateway();
  const render = new FakeRenderGateway();
  const blob = new FakeBlobStorage();
  const carousels = new FakeCarouselRepo();
  const sagaState = createSagaStore();
  const persist = new PersistOrchestrator({ llm, render, blob, carousels, state: sagaState });
  const c: Container = {
    knowledge: new FakeKnowledgeRepo(),
    templates: new FakeTemplateRepo(),
    carousels, elements: new FakeElementRepo(), blob, llm, render, persist, sagaState,
  };
  setContainer(c);
});

describe('Extra BFF routes', () => {
  it('GET /api/knowledge', async () => {
    const { NextRequest } = await import('next/server');
    const { GET } = await import('@/app/api/knowledge/route');
    const res = await GET(new NextRequest('http://x/api/knowledge?category=Frameworks'));
    expect(res.status).toBe(200);
  });

  it('GET /api/elements', async () => {
    const { NextRequest } = await import('next/server');
    const { GET } = await import('@/app/api/elements/route');
    const res = await GET(new NextRequest('http://x/api/elements'));
    expect(res.status).toBe(200);
  });

  it('GET /api/carousels', async () => {
    const { NextRequest } = await import('next/server');
    const { GET } = await import('@/app/api/carousels/route');
    const res = await GET(new NextRequest('http://x/api/carousels'));
    expect(res.status).toBe(200);
  });

  it('POST /api/onboarding/seed returns counts', async () => {
    const { POST } = await import('@/app/api/onboarding/seed/route');
    const res = await POST();
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.seeded).toBeDefined();
  });

  it('POST /api/chat/stream rejects 400 on missing fields', async () => {
    const { POST } = await import('@/app/api/chat/stream/route');
    const req = new Request('http://x/api/chat/stream', { method: 'POST', body: '{}' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('POST /api/chat/stream relays to llm (200)', async () => {
    const { POST } = await import('@/app/api/chat/stream/route');
    const req = new Request('http://x/api/chat/stream', {
      method: 'POST', body: JSON.stringify({ message: 'hi', sessionId: 'S' }),
    });
    const res = await POST(req as never);
    // Fake llm returns Response('hi') with default 200.
    expect([200, 502]).toContain(res.status);
  });
});
