// forward-compat-endpoints.test.ts — Cycle 3 §D: GET /carousels/series/:id,
// GET /carousels/repurpose/:type, POST /carousels/:id/moderation. Each one
// activates one of the 11 forward-compat fields documented in ARCH §14.7-15.
import './_setup.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { Hono } from 'hono';

let app: Hono;
let fakes: typeof import('../fakes/in-memory-repos.js');
let container: typeof import('../../src/repositories/container.js');
let carouselsFake: import('../fakes/in-memory-repos.js').FakeCarouselRepo;

beforeAll(async () => {
  fakes = await import('../fakes/in-memory-repos.js');
  container = await import('../../src/repositories/container.js');
  const mod = await import('../../src/server.js');
  app = mod.app;
});

beforeEach(() => {
  carouselsFake = new fakes.FakeCarouselRepo();
  container.setRepos({ carousels: carouselsFake });
});

describe('GET /carousels/series/:seriesId — series_id read activation', () => {
  it('returns only carousels in that series + metadata seriesId echo', async () => {
    await carouselsFake.create({ title: 'a', seriesId: 'series-7', seriesVolume: 1 });
    await carouselsFake.create({ title: 'b', seriesId: 'series-7', seriesVolume: 2 });
    await carouselsFake.create({ title: 'c', seriesId: 'series-9' });
    await carouselsFake.create({ title: 'd' });

    const res = await app.request('/carousels/series/series-7');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ seriesId: string }>;
      seriesId: string;
    };
    expect(body.seriesId).toBe('series-7');
    expect(body.items.length).toBe(2);
    for (const item of body.items) {
      expect(item.seriesId).toBe('series-7');
    }
  });

  it('returns empty list (200) when seriesId has no matches', async () => {
    const res = await app.request('/carousels/series/no-such-series');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items.length).toBe(0);
  });
});

describe('GET /carousels/repurpose/:type — repurpose_type read activation', () => {
  it('filters by repurposeType (original / series / clip)', async () => {
    await carouselsFake.create({ title: 'a', repurposeType: 'original' });
    await carouselsFake.create({ title: 'b', repurposeType: 'original' });
    await carouselsFake.create({ title: 'c', repurposeType: 'clip' });

    const res = await app.request('/carousels/repurpose/original');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ repurposeType: string }>;
      total: number;
      repurposeType: string;
    };
    expect(body.repurposeType).toBe('original');
    expect(body.total).toBe(2);
    for (const item of body.items) {
      expect(item.repurposeType).toBe('original');
    }
  });

  it('rejects an unknown repurposeType with 400 + helpful message', async () => {
    const res = await app.request('/carousels/repurpose/garbage');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('invalid_repurpose_type');
    expect(body.message).toMatch(/original/);
  });

  it('accepts all 5 known repurpose types', async () => {
    for (const t of ['original', 'series', 'clip', 'remix', 'translation']) {
      const res = await app.request(`/carousels/repurpose/${t}`);
      expect(res.status).toBe(200);
    }
  });
});

describe('POST /carousels/:id/moderation — moderation_status write activation', () => {
  it('updates moderation_status to PASSED + echoes the new state', async () => {
    const c = await carouselsFake.create({ title: 'mod-target' });
    const res = await app.request(`/carousels/${c.id}/moderation`, {
      method: 'POST',
      body: JSON.stringify({ status: 'PASSED' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; moderationStatus: string };
    expect(body.id).toBe(c.id);
    expect(body.moderationStatus).toBe('PASSED');

    // Confirm the underlying record actually changed.
    const after = await carouselsFake.get(c.id);
    expect(after?.moderationStatus).toBe('PASSED');
  });

  it('updates to BLOCKED with reason payload (reason is recorded in logs only)', async () => {
    const c = await carouselsFake.create({ title: 'mod-blocked' });
    const res = await app.request(`/carousels/${c.id}/moderation`, {
      method: 'POST',
      body: JSON.stringify({ status: 'BLOCKED', reason: '정치 키워드' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { moderationStatus: string };
    expect(body.moderationStatus).toBe('BLOCKED');
  });

  it('rejects a missing status with 400', async () => {
    const c = await carouselsFake.create({ title: 'x' });
    const res = await app.request(`/carousels/${c.id}/moderation`, {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown status with 400', async () => {
    const c = await carouselsFake.create({ title: 'x' });
    const res = await app.request(`/carousels/${c.id}/moderation`, {
      method: 'POST',
      body: JSON.stringify({ status: 'maybe' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown carousel id', async () => {
    const res = await app.request('/carousels/recNotReal/moderation', {
      method: 'POST',
      body: JSON.stringify({ status: 'PASSED' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(404);
  });
});
