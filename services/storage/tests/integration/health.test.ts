// health.test.ts — /health contract (Cycle 1 acceptance).
// Mocks S3 HeadBucket to avoid real network. Verifies shape + status fields.
import './_setup.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

let app: import('hono').Hono;
let fakes: typeof import('../fakes/in-memory-repos.js');
let container: typeof import('../../src/repositories/container.js');

beforeAll(async () => {
  fakes = await import('../fakes/in-memory-repos.js');
  container = await import('../../src/repositories/container.js');
  const mod = await import('../../src/server.js');
  app = mod.app;
});

beforeEach(() => {
  // Make skeleton route tests below deterministic — fake everything.
  container.setRepos({
    knowledge: new fakes.FakeKnowledgeRepo(),
    templates: new fakes.FakeTemplateRepo(),
    carousels: new fakes.FakeCarouselRepo(),
    elements: new fakes.FakeElementRepo(),
    blob: new fakes.FakeBlobStorage(),
  });
});

describe('GET /health', () => {
  it('returns 200 with the documented shape', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.service).toBe('slidesmith-storage');
    expect(['ok', 'degraded']).toContain(body.status);
    expect(typeof body.uptime).toBe('number');
    expect(body.airtable).toMatchObject({
      available: expect.any(Boolean),
      throttled: expect.any(Boolean),
    });
    expect(body.s3).toMatchObject({
      available: expect.any(Boolean),
      bucketAccessible: expect.any(Boolean),
    });
    expect(body.cache).toMatchObject({
      hits: expect.any(Number),
      misses: expect.any(Number),
      size: expect.any(Number),
      hitRate: expect.any(Number),
    });
  });

  it('does not leak vendor words in the response body', async () => {
    const res = await app.request('/health');
    const text = (await res.text()).toLowerCase();
    expect(text).not.toContain('airtablerecordid');
    expect(text).not.toContain('s3url');
    expect(text).not.toContain('s3bucket');
  });
});

describe('top-level route shape', () => {
  it('GET /knowledge returns the empty page contract on a fresh fake', async () => {
    const res = await app.request('/knowledge');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ items: [], total: 0, hasMore: false });
  });

  // Cycle 2 Fix F3 / Review §M1(f): empty {} body is no longer a valid POST.
  // Saga-issued requests always carry at least one identifying field.
  it('POST /carousels — empty body is rejected with 400', async () => {
    const res = await app.request('/carousels', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('unknown path returns 404 with json body', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('not_found');
  });
});
