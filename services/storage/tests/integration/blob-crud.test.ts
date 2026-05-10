// blob-crud.test.ts — upload + signed URL + delete + idempotency + TTL.
import './_setup.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { Hono } from 'hono';

let app: Hono;
let fakes: typeof import('../fakes/in-memory-repos.js');
let container: typeof import('../../src/repositories/container.js');
let idem: typeof import('../../src/lib/idempotency.js');
let blobFake: import('../fakes/in-memory-repos.js').FakeBlobStorage;

beforeAll(async () => {
  fakes = await import('../fakes/in-memory-repos.js');
  container = await import('../../src/repositories/container.js');
  idem = await import('../../src/lib/idempotency.js');
  const mod = await import('../../src/server.js');
  app = mod.app;
});

beforeEach(() => {
  blobFake = new fakes.FakeBlobStorage();
  container.setRepos({ blob: blobFake });
  idem._resetIdempotency();
});

describe('/blob — JSON upload', () => {
  it('uploads base64 body and returns key + signed url + etag', async () => {
    const png = Buffer.from('test-bytes').toString('base64');
    const res = await app.request('/blob/upload', {
      method: 'POST',
      body: JSON.stringify({ key: 'carousels/abc/01.png', contentType: 'image/png', base64: png }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { key: string; url: string; etag: string };
    expect(body.key).toBe('carousels/abc/01.png');
    expect(body.url).toMatch(/^https:\/\//);
    expect(body.etag).toBeTruthy();
  });

  it('rejects empty body with 400', async () => {
    const res = await app.request('/blob/upload', {
      method: 'POST',
      body: JSON.stringify({ key: 'k', contentType: 'image/png' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });
});

describe('/blob — idempotency', () => {
  it('duplicate Idempotency-Key returns the original record', async () => {
    const png = Buffer.from('x').toString('base64');
    const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': 'b-1' };
    const body = JSON.stringify({ key: 'k1', contentType: 'image/png', base64: png });

    const r1 = await app.request('/blob/upload', { method: 'POST', body, headers });
    expect(r1.status).toBe(201);
    const a = (await r1.json()) as { etag: string };

    const r2 = await app.request('/blob/upload', { method: 'POST', body, headers });
    expect(r2.status).toBe(200);
    const b = (await r2.json()) as { etag: string; alreadyExists?: boolean };
    expect(b.etag).toBe(a.etag);
    expect(b.alreadyExists).toBe(true);
  });
});

describe('/blob/url/:key — 5-min TTL', () => {
  it('returns 5-min default + matches expiresAt window', async () => {
    const before = Date.now();
    const res = await app.request('/blob/url/carousels/abc/01.png');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ttlSeconds: number; expiresAt: string };
    expect(body.ttlSeconds).toBe(300);
    const expMs = Date.parse(body.expiresAt);
    expect(expMs - before).toBeGreaterThan(290_000);
    expect(expMs - before).toBeLessThan(310_000);
  });

  it('honours ?expires=900 (clamped to MAX_TTL=3600)', async () => {
    const res = await app.request('/blob/url/k1?expires=900');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ttlSeconds: number };
    expect(body.ttlSeconds).toBe(900);
  });

  it('rejects ?expires=10 (below 60s minimum)', async () => {
    const res = await app.request('/blob/url/k1?expires=10');
    expect(res.status).toBe(400);
  });
});

describe('/blob/:key — delete is idempotent', () => {
  it('returns 204 on delete and 204 again when key is gone', async () => {
    await blobFake.upload({ key: 'gone', body: Buffer.from('x'), contentType: 'image/png' });
    const r1 = await app.request('/blob/gone', { method: 'DELETE' });
    expect(r1.status).toBe(204);
    const r2 = await app.request('/blob/gone', { method: 'DELETE' });
    expect(r2.status).toBe(204);
  });
});

// Cycle 2 Fix F1 (Review §H1): contentType whitelist + key path-safe regex
// + ContentDisposition: 'attachment' close the XSS / drive-by file vector.
describe('/blob/upload — contentType whitelist (Cycle 2 Fix F1)', () => {
  const png = Buffer.from('x').toString('base64');

  it.each([
    ['text/html'],
    ['application/x-msdownload'],
    ['text/javascript'],
    ['application/octet-stream'],
    ['image/svg+xml'],
  ])('rejects forbidden contentType %s with HTTP 400', async (ct) => {
    const res = await app.request('/blob/upload', {
      method: 'POST',
      body: JSON.stringify({ key: 'x.bin', contentType: ct, base64: png }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_body');
  });

  it.each([['image/png'], ['image/jpeg'], ['image/jpg'], ['image/webp'], ['application/pdf']])(
    'accepts allowed contentType %s with HTTP 201',
    async (ct) => {
      const res = await app.request('/blob/upload', {
        method: 'POST',
        body: JSON.stringify({ key: 'allowed/file.dat', contentType: ct, base64: png }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status).toBe(201);
    },
  );

  it.each([
    ['../../../etc/passwd'],
    ['has space.png'],
    ['weird?query=1'],
    ['back\\slash.png'],
    ['line\nbreak.png'],
  ])('rejects path-unsafe key %s with HTTP 400', async (badKey) => {
    const res = await app.request('/blob/upload', {
      method: 'POST',
      body: JSON.stringify({ key: badKey, contentType: 'image/png', base64: png }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });
});

describe('/blob/upload — concurrent same Idempotency-Key (Cycle 2 Fix F2)', () => {
  it('Promise.all of 5 same-key uploads yields ONE persisted record', async () => {
    const png = Buffer.from('x').toString('base64');
    const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': 'race-blob' };
    const body = JSON.stringify({ key: 'concurrent.png', contentType: 'image/png', base64: png });

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => app.request('/blob/upload', { method: 'POST', body, headers })),
    );
    const bodies = (await Promise.all(responses.map((r) => r.json()))) as Array<{
      etag: string;
      alreadyExists?: boolean;
    }>;

    // All five share one etag — proof that uploadObject ran once.
    const uniqueEtags = new Set(bodies.map((b) => b.etag));
    expect(uniqueEtags.size).toBe(1);

    // Exactly one creator (no alreadyExists), the other four marked alreadyExists.
    const created = bodies.filter((b) => !b.alreadyExists).length;
    const shared = bodies.filter((b) => b.alreadyExists).length;
    expect(created).toBe(1);
    expect(shared).toBe(4);
  });
});
