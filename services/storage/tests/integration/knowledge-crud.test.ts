// knowledge-crud.test.ts — full CRUD via fakes (Cycle 2 acceptance).
import './_setup.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { Hono } from 'hono';

const VENDOR_PATTERN = /(airtable|s3url|s3bucket|puppeteer|gemini|claudemessage|claudecli|airtablerecordid)/i;

let app: Hono;
let fakes: typeof import('../fakes/in-memory-repos.js');
let container: typeof import('../../src/repositories/container.js');
let knowledgeFake: import('../fakes/in-memory-repos.js').FakeKnowledgeRepo;

beforeAll(async () => {
  fakes = await import('../fakes/in-memory-repos.js');
  container = await import('../../src/repositories/container.js');
  const mod = await import('../../src/server.js');
  app = mod.app;
});

beforeEach(() => {
  knowledgeFake = new fakes.FakeKnowledgeRepo();
  container.setRepos({ knowledge: knowledgeFake });
});

describe('/knowledge — CRUD', () => {
  it('POST creates an item and returns 201', async () => {
    const res = await app.request('/knowledge', {
      method: 'POST',
      body: JSON.stringify({
        name: 'PAS',
        category: 'Frameworks',
        description: 'Problem-Agitate-Solution',
        whenToUse: 'short hooks',
        tags: ['copy'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.name).toBe('PAS');
    expect(body.recordId).toBeDefined();
    expect(VENDOR_PATTERN.test(JSON.stringify(body))).toBe(false);
  });

  it('GET ?category=Frameworks returns paginated list', async () => {
    await knowledgeFake.create({ name: 'PAS', category: 'Frameworks' });
    await knowledgeFake.create({ name: 'AIDA', category: 'Frameworks' });
    await knowledgeFake.create({ name: 'BV', category: 'BrandVoice' });

    const res = await app.request('/knowledge?category=Frameworks');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[]; total: number; hasMore: boolean };
    expect(body.items.length).toBe(2);
    expect(body.total).toBe(2);
    expect(body.hasMore).toBe(false);
  });

  it('GET /:id returns 404 for unknown id', async () => {
    const res = await app.request('/knowledge/nope');
    expect(res.status).toBe(404);
  });

  it('PATCH updates fields and PATCH on missing id is 404', async () => {
    const created = await knowledgeFake.create({ name: 'PAS', category: 'Frameworks' });
    const res = await app.request(`/knowledge/${created.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ description: 'updated' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { description: string };
    expect(body.description).toBe('updated');

    const missing = await app.request('/knowledge/nope', {
      method: 'PATCH',
      body: JSON.stringify({ description: 'x' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(missing.status).toBe(404);
  });

  it('DELETE returns 204 then 404', async () => {
    const created = await knowledgeFake.create({ name: 'PAS', category: 'Frameworks' });
    const ok = await app.request(`/knowledge/${created.id}`, { method: 'DELETE' });
    expect(ok.status).toBe(204);
    const gone = await app.request(`/knowledge/${created.id}`, { method: 'DELETE' });
    expect(gone.status).toBe(404);
  });

  it('POST validates body and rejects invalid category with 400', async () => {
    const res = await app.request('/knowledge', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', category: 'NotReal' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });
});
