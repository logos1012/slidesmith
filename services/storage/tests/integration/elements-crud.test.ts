// elements-crud.test.ts — full CRUD + 4 element types (Cycle 2).
import './_setup.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { Hono } from 'hono';

let app: Hono;
let fakes: typeof import('../fakes/in-memory-repos.js');
let container: typeof import('../../src/repositories/container.js');
let elementsFake: import('../fakes/in-memory-repos.js').FakeElementRepo;

beforeAll(async () => {
  fakes = await import('../fakes/in-memory-repos.js');
  container = await import('../../src/repositories/container.js');
  const mod = await import('../../src/server.js');
  app = mod.app;
});

beforeEach(() => {
  elementsFake = new fakes.FakeElementRepo();
  container.setRepos({ elements: elementsFake });
});

describe('/elements — CRUD', () => {
  it('POST creates a character element', async () => {
    const res = await app.request('/elements', {
      method: 'POST',
      body: JSON.stringify({
        type: 'character',
        name: 'jisoo',
        src: 'https://x',
        aliases: ['지수'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { type: string };
    expect(body.type).toBe('character');
  });

  it('rejects unknown type with 400', async () => {
    const res = await app.request('/elements', {
      method: 'POST',
      body: JSON.stringify({ type: 'unicorn', name: 'x', src: 'y' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('GET ?type=character filters by type', async () => {
    await elementsFake.create({ type: 'character', name: 'jisoo', src: 'a' });
    await elementsFake.create({ type: 'background', name: 'gradient', src: 'b' });
    const res = await app.request('/elements?type=character');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items.length).toBe(1);
  });

  it('PATCH + DELETE flow', async () => {
    const created = await elementsFake.create({ type: 'prop', name: 'glasses', src: 'a' });
    const patch = await app.request(`/elements/${created.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'glasses-v2' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(patch.status).toBe(200);
    const del = await app.request(`/elements/${created.id}`, { method: 'DELETE' });
    expect(del.status).toBe(204);
  });

  it('GET ?limit=invalid → 400', async () => {
    const res = await app.request('/elements?limit=abc');
    expect(res.status).toBe(400);
  });

  it('GET /:id 404 + DELETE missing 404 + PATCH missing 404', async () => {
    expect((await app.request('/elements/nope')).status).toBe(404);
    expect((await app.request('/elements/nope', { method: 'DELETE' })).status).toBe(404);
    const r = await app.request('/elements/nope', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'x' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(r.status).toBe(404);
  });

  it('PATCH validation — empty name → 400', async () => {
    const created = await elementsFake.create({ type: 'prop', name: 'x', src: 'a' });
    const r = await app.request(`/elements/${created.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(r.status).toBe(400);
  });
});
