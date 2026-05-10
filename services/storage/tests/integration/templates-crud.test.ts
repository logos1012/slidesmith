// templates-crud.test.ts — full CRUD + usage_count counter (Cycle 2).
import './_setup.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { Hono } from 'hono';

let app: Hono;
let fakes: typeof import('../fakes/in-memory-repos.js');
let container: typeof import('../../src/repositories/container.js');
let templatesFake: import('../fakes/in-memory-repos.js').FakeTemplateRepo;

beforeAll(async () => {
  fakes = await import('../fakes/in-memory-repos.js');
  container = await import('../../src/repositories/container.js');
  const mod = await import('../../src/server.js');
  app = mod.app;
});

beforeEach(() => {
  templatesFake = new fakes.FakeTemplateRepo();
  container.setRepos({ templates: templatesFake });
});

describe('/templates — CRUD + usage counter', () => {
  it('POST + GET round-trip preserves schema + files', async () => {
    const post = await app.request('/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Listicle',
        schema: { slides: 10 },
        files: ['index.html'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(post.status).toBe(201);
    const created = (await post.json()) as { id: string };
    const got = await app.request(`/templates/${created.id}`);
    expect(got.status).toBe(200);
    const body = (await got.json()) as { schema: unknown; files: unknown };
    expect(body.schema).toEqual({ slides: 10 });
    expect(body.files).toEqual(['index.html']);
  });

  it('PATCH /:id/usage increments usageCount', async () => {
    const created = await templatesFake.create({ name: 'X', usageCount: 5 });
    const r1 = await app.request(`/templates/${created.id}/usage`, {
      method: 'PATCH',
      body: JSON.stringify({ by: 3 }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(r1.status).toBe(200);
    const after = (await r1.json()) as { usageCount: number };
    expect(after.usageCount).toBe(8);
  });

  it('PATCH usage on missing id returns 404', async () => {
    const res = await app.request('/templates/nope/usage', {
      method: 'PATCH',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(404);
  });

  it('DELETE 204 then 404', async () => {
    const created = await templatesFake.create({ name: 'X' });
    const ok = await app.request(`/templates/${created.id}`, { method: 'DELETE' });
    expect(ok.status).toBe(204);
    const gone = await app.request(`/templates/${created.id}`, { method: 'DELETE' });
    expect(gone.status).toBe(404);
  });

  it('GET 404 for missing id', async () => {
    const r = await app.request('/templates/nope');
    expect(r.status).toBe(404);
  });

  it('PATCH updates name; PATCH on missing id is 404', async () => {
    const created = await templatesFake.create({ name: 'X', version: '1.0.0' });
    const r1 = await app.request(`/templates/${created.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Y' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(r1.status).toBe(200);
    const after = (await r1.json()) as { name: string };
    expect(after.name).toBe('Y');

    const missing = await app.request('/templates/nope', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Z' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(missing.status).toBe(404);
  });

  it('POST validates body — empty name → 400', async () => {
    const res = await app.request('/templates', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('GET ?limit=invalid → 400', async () => {
    const res = await app.request('/templates?limit=abc');
    expect(res.status).toBe(400);
  });
});
