// carousels-crud.test.ts — full CRUD + 11 forward-compat round-trip + idempotency.
// SPEC §5-4 + ARCH §3-8 / §14.7-15: Day 1 schema preserves series, repurpose,
// moderation, captions, insights so v1.1 / v1.5 migration burden is zero.
import './_setup.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { Hono } from 'hono';

const VENDOR_PATTERN = /(airtable|s3url|s3bucket|puppeteer|gemini|claudemessage|claudecli|airtablerecordid)/i;

let app: Hono;
let fakes: typeof import('../fakes/in-memory-repos.js');
let container: typeof import('../../src/repositories/container.js');
let idem: typeof import('../../src/lib/idempotency.js');
let carouselsFake: import('../fakes/in-memory-repos.js').FakeCarouselRepo;

beforeAll(async () => {
  fakes = await import('../fakes/in-memory-repos.js');
  container = await import('../../src/repositories/container.js');
  idem = await import('../../src/lib/idempotency.js');
  const mod = await import('../../src/server.js');
  app = mod.app;
});

beforeEach(() => {
  carouselsFake = new fakes.FakeCarouselRepo();
  container.setRepos({ carousels: carouselsFake });
  idem._resetIdempotency();
});

describe('/carousels — CRUD', () => {
  it('POST creates a carousel and 11 forward-compat fields round-trip', async () => {
    const body = {
      title: '테스트',
      seriesId: 'series-1',
      seriesVolume: 1,
      parentCarouselId: 'recParent',
      repurposeType: 'original',
      hookCategory: 'data',
      narrativeArc: 'problem-solution',
      moderationStatus: 'PASSED',
      captionJson: { text: '안녕' },
      insightsJson: { impressions: 0 },
      lastUsedAt: '2026-05-10T00:00:00Z',
      versionHistory: [{ ts: '2026-05-10' }],
    };
    const res = await app.request('/carousels', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(201);
    const out = (await res.json()) as Record<string, unknown>;
    // Each of the 11 forward-compat fields preserved.
    expect(out.seriesId).toBe('series-1');
    expect(out.seriesVolume).toBe(1);
    expect(out.parentCarouselId).toBe('recParent');
    expect(out.repurposeType).toBe('original');
    expect(out.hookCategory).toBe('data');
    expect(out.narrativeArc).toBe('problem-solution');
    expect(out.moderationStatus).toBe('PASSED');
    expect(out.captionJson).toEqual({ text: '안녕' });
    expect(out.insightsJson).toEqual({ impressions: 0 });
    expect(out.lastUsedAt).toBe('2026-05-10T00:00:00Z');
    expect(out.versionHistory).toEqual([{ ts: '2026-05-10' }]);

    // Vendor-leak guard: response body must contain none of the forbidden words.
    expect(VENDOR_PATTERN.test(JSON.stringify(out))).toBe(false);
  });

  it('GET ?seriesId=X returns only carousels in that series', async () => {
    await carouselsFake.create({ title: 'in-series', seriesId: 's-A' });
    await carouselsFake.create({ title: 'other-series', seriesId: 's-B' });
    await carouselsFake.create({ title: 'no-series' });
    const res = await app.request('/carousels?seriesId=s-A');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ seriesId: string | null }> };
    expect(body.items.length).toBe(1);
    expect(body.items[0]?.seriesId).toBe('s-A');
  });

  it('PATCH updates moderation_status / caption_json / insights_json', async () => {
    const c = await carouselsFake.create({ title: 'x' });
    const res = await app.request(`/carousels/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        moderationStatus: 'BLOCKED',
        captionJson: { text: 'updated' },
        insightsJson: { impressions: 100 },
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.moderationStatus).toBe('BLOCKED');
    expect(body.captionJson).toEqual({ text: 'updated' });
    expect(body.insightsJson).toEqual({ impressions: 100 });
  });

  it('DELETE 204 then 404', async () => {
    const c = await carouselsFake.create({ title: 'x' });
    const ok = await app.request(`/carousels/${c.id}`, { method: 'DELETE' });
    expect(ok.status).toBe(204);
    const gone = await app.request(`/carousels/${c.id}`, { method: 'DELETE' });
    expect(gone.status).toBe(404);
  });
});

describe('/carousels — idempotency', () => {
  it('duplicate POST with same Idempotency-Key returns the original record', async () => {
    const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': 'dup-1' };
    const body = JSON.stringify({ title: 'dup', seriesId: 's-A' });
    const r1 = await app.request('/carousels', { method: 'POST', body, headers });
    expect(r1.status).toBe(201);
    const a = (await r1.json()) as { id: string };

    const r2 = await app.request('/carousels', { method: 'POST', body, headers });
    expect(r2.status).toBe(200);
    const b = (await r2.json()) as { id: string; alreadyExists?: boolean };
    expect(b.id).toBe(a.id);
    expect(b.alreadyExists).toBe(true);

    // Only one record actually persisted to the underlying repo.
    const list = await app.request('/carousels');
    const out = (await list.json()) as { items: unknown[] };
    expect(out.items.length).toBe(1);
  });

  it('different Idempotency-Keys produce two records', async () => {
    const r1 = await app.request('/carousels', {
      method: 'POST',
      body: JSON.stringify({ title: 'a' }),
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'k-A' },
    });
    const r2 = await app.request('/carousels', {
      method: 'POST',
      body: JSON.stringify({ title: 'b' }),
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'k-B' },
    });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    const list = await app.request('/carousels');
    const out = (await list.json()) as { items: unknown[] };
    expect(out.items.length).toBe(2);
  });

  // Cycle 2 Fix F2 (Review §H2): concurrent POSTs with the same key MUST
  // converge on one record. The Test stage reproduced 5 records here pre-fix.
  it('Promise.all of 5 same-key POSTs persists exactly ONE record', async () => {
    const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': 'race-car' };
    const body = JSON.stringify({ title: 'race', seriesId: 's-race' });

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => app.request('/carousels', { method: 'POST', body, headers })),
    );
    const bodies = (await Promise.all(responses.map((r) => r.json()))) as Array<{
      id: string;
      alreadyExists?: boolean;
    }>;

    // One id across all 5 responses.
    const uniqueIds = new Set(bodies.map((b) => b.id));
    expect(uniqueIds.size).toBe(1);

    const created = bodies.filter((b) => !b.alreadyExists).length;
    const shared = bodies.filter((b) => b.alreadyExists).length;
    expect(created).toBe(1);
    expect(shared).toBe(4);

    // And only one record actually landed in the underlying repo.
    const list = await app.request('/carousels');
    const out = (await list.json()) as { items: unknown[] };
    expect(out.items.length).toBe(1);
  });
});

// Cycle 2 Fix F3 (Review §M1): Zod boundary checks.
describe('/carousels — input validation (Cycle 2 Fix F3)', () => {
  it('rejects negative seriesVolume with 400', async () => {
    const res = await app.request('/carousels', {
      method: 'POST',
      body: JSON.stringify({ title: 'x', seriesVolume: -1 }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('rejects non-ISO lastUsedAt with 400', async () => {
    const res = await app.request('/carousels', {
      method: 'POST',
      body: JSON.stringify({ title: 'x', lastUsedAt: 'yesterday' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('rejects unknown moderationStatus with 400', async () => {
    const res = await app.request('/carousels', {
      method: 'POST',
      body: JSON.stringify({ title: 'x', moderationStatus: 'maybe' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('rejects empty {} body with 400', async () => {
    const res = await app.request('/carousels', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });
});
