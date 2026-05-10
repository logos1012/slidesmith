// saga-compensation.test.ts — Cycle 3 §C: storage-side compensating actions
// the web BFF Saga calls on partial failure. We verify:
//   1. POST /carousels + DELETE /carousels/:id  → record gone after rollback
//   2. POST /blob/upload + DELETE /blob/:key   → key gone after rollback
//   3. DELETE on a missing key/record is idempotent (Saga retries are safe)
//   4. Forward+rollback under concurrent Idempotency-Key spam — single record
//      created, single delete needed, no orphaned children.
import './_setup.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { Hono } from 'hono';

let app: Hono;
let fakes: typeof import('../fakes/in-memory-repos.js');
let container: typeof import('../../src/repositories/container.js');
let idem: typeof import('../../src/lib/idempotency.js');
let carouselsFake: import('../fakes/in-memory-repos.js').FakeCarouselRepo;
let blobFake: import('../fakes/in-memory-repos.js').FakeBlobStorage;

beforeAll(async () => {
  fakes = await import('../fakes/in-memory-repos.js');
  container = await import('../../src/repositories/container.js');
  idem = await import('../../src/lib/idempotency.js');
  const mod = await import('../../src/server.js');
  app = mod.app;
});

beforeEach(() => {
  carouselsFake = new fakes.FakeCarouselRepo();
  blobFake = new fakes.FakeBlobStorage();
  container.setRepos({ carousels: carouselsFake, blob: blobFake });
  idem._resetIdempotency();
});

describe('Saga compensation — POST /carousels then DELETE /carousels/:id', () => {
  it('round-trip succeeds: record exists after POST, gone after DELETE', async () => {
    const create = await app.request('/carousels', {
      method: 'POST',
      body: JSON.stringify({ title: 'saga-1', seriesId: 's1' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(create.status).toBe(201);
    const created = (await create.json()) as { id: string };
    expect(await carouselsFake.get(created.id)).not.toBeNull();

    const del = await app.request(`/carousels/${created.id}`, { method: 'DELETE' });
    expect(del.status).toBe(204);
    expect(await carouselsFake.get(created.id)).toBeNull();
  });

  it('DELETE on missing id is 404 (Saga ledger absorbs as already-compensated)', async () => {
    const r = await app.request('/carousels/recNotReal', { method: 'DELETE' });
    expect(r.status).toBe(404);
  });
});

describe('Saga compensation — POST /blob/upload then DELETE /blob/:key', () => {
  it('round-trip succeeds: object exists after upload, gone after DELETE', async () => {
    const png = Buffer.from('saga-bytes').toString('base64');
    const upload = await app.request('/blob/upload', {
      method: 'POST',
      body: JSON.stringify({
        key: 'saga/01.png',
        contentType: 'image/png',
        base64: png,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(upload.status).toBe(201);

    const del = await app.request('/blob/saga/01.png', { method: 'DELETE' });
    expect(del.status).toBe(204);
    // Subsequent presign would still respond (S3 doesn't 404 on missing keys
    // until the GET happens) — what matters is the second DELETE is idempotent.
    const del2 = await app.request('/blob/saga/01.png', { method: 'DELETE' });
    expect(del2.status).toBe(204);
  });

  it('DELETE on missing key returns 204 (Saga retries are safe)', async () => {
    const r = await app.request('/blob/never-uploaded.png', { method: 'DELETE' });
    expect(r.status).toBe(204);
  });
});

describe('Saga compensation — multi-step orchestration', () => {
  it('5-step Saga: upload → carousel → moderation → rollback all 3 leaves no orphans', async () => {
    const png = Buffer.from('s5').toString('base64');

    // Step 1 — upload blob.
    const upload = await app.request('/blob/upload', {
      method: 'POST',
      body: JSON.stringify({ key: 'saga5/cover.png', contentType: 'image/png', base64: png }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(upload.status).toBe(201);
    const blobOut = (await upload.json()) as { key: string };

    // Step 2 — create carousel that references the blob via s3Keys.
    const create = await app.request('/carousels', {
      method: 'POST',
      body: JSON.stringify({
        title: 'saga-5',
        seriesId: 'saga-series',
        s3Keys: [blobOut.key],
        moderationStatus: 'pending',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(create.status).toBe(201);
    const carousel = (await create.json()) as { id: string };

    // Step 3 — moderation outcome arrives async.
    const mod = await app.request(`/carousels/${carousel.id}/moderation`, {
      method: 'POST',
      body: JSON.stringify({ status: 'BLOCKED', reason: 'sensitive topic' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(mod.status).toBe(200);

    // Step 4 — Saga compensates because moderation failed.
    const rollbackBlob = await app.request(`/blob/${blobOut.key}`, { method: 'DELETE' });
    expect(rollbackBlob.status).toBe(204);
    const rollbackCarousel = await app.request(`/carousels/${carousel.id}`, {
      method: 'DELETE',
    });
    expect(rollbackCarousel.status).toBe(204);

    // Step 5 — assert nothing leaked.
    expect(await carouselsFake.get(carousel.id)).toBeNull();
    const list = await app.request('/carousels');
    const body = (await list.json()) as { items: unknown[] };
    expect(body.items.length).toBe(0);
  });

  it('idempotent retry: 5x parallel POST + 5x parallel DELETE leaves zero records', async () => {
    const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': 'saga-cmp' };
    const body = JSON.stringify({ title: 'cmp', seriesId: 's-cmp' });

    // 5x parallel POST collapses to 1 record.
    const creates = await Promise.all(
      Array.from({ length: 5 }, () => app.request('/carousels', { method: 'POST', body, headers })),
    );
    const ids = new Set(
      (await Promise.all(creates.map((r) => r.json()))).map((b) => (b as { id: string }).id),
    );
    expect(ids.size).toBe(1);
    const id = [...ids][0]!;

    // 5x parallel DELETE — first one wins with 204, the rest see 404. Net: 0
    // records remain (no double-delete error, no leak).
    const deletes = await Promise.all(
      Array.from({ length: 5 }, () => app.request(`/carousels/${id}`, { method: 'DELETE' })),
    );
    const codes = deletes.map((r) => r.status).sort();
    expect(codes[0]).toBe(204);
    expect(codes.every((c) => c === 204 || c === 404)).toBe(true);

    expect(await carouselsFake.get(id)).toBeNull();
  });
});
