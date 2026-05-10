// templates-seed.test.ts — v1.1.2: POST /templates/seed imports the v1.0
// default Aurora bundle exactly once (idempotent on re-run + concurrent calls).
// Mirrors knowledge-seed.test.ts so the contract is identical across resources.
import './_setup.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { Hono } from 'hono';

let app: Hono;
let fakes: typeof import('../fakes/in-memory-repos.js');
let container: typeof import('../../src/repositories/container.js');
let idem: typeof import('../../src/lib/idempotency.js');
let templatesFake: import('../fakes/in-memory-repos.js').FakeTemplateRepo;

beforeAll(async () => {
  fakes = await import('../fakes/in-memory-repos.js');
  container = await import('../../src/repositories/container.js');
  idem = await import('../../src/lib/idempotency.js');
  const mod = await import('../../src/server.js');
  app = mod.app;
});

beforeEach(() => {
  templatesFake = new fakes.FakeTemplateRepo();
  container.setRepos({ templates: templatesFake });
  idem._resetIdempotency();
});

const seedHeaders = (key: string): Record<string, string> => ({
  'Idempotency-Key': key,
});

describe('POST /templates/seed — v1.0 Aurora default bundle', () => {
  it('rejects requests without Idempotency-Key with HTTP 400 + Korean userMessage', async () => {
    const res = await app.request('/templates/seed', { method: 'POST' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      userMessage: string;
    };
    expect(body.error).toBe('missing_idempotency_key');
    expect(body.userMessage).toContain('Idempotency-Key');
    expect(/[ㄱ-힝]/u.test(body.userMessage)).toBe(true);

    // Repository must NOT have been written to.
    const list = await app.request('/templates?limit=20');
    const items = (await list.json()) as { items: unknown[] };
    expect(items.items.length).toBe(0);
  });

  it('also rejects an empty Idempotency-Key (whitespace) with 400', async () => {
    const res = await app.request('/templates/seed', {
      method: 'POST',
      headers: { 'Idempotency-Key': '   ' },
    });
    expect(res.status).toBe(400);
  });

  it('first run inserts exactly the bundle (3 Aurora templates)', async () => {
    const res = await app.request('/templates/seed', {
      method: 'POST',
      headers: seedHeaders('templates-first-run'),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      inserted: number;
      skipped: number;
      failed: number;
      total: number;
      durationMs: number;
    };
    expect(body.total).toBe(3);
    expect(body.inserted).toBe(3);
    expect(body.skipped).toBe(0);
    expect(body.failed).toBe(0);
    expect(body.durationMs).toBeGreaterThanOrEqual(0);

    // GET /templates returns the same 3 by name.
    const list = await app.request('/templates?limit=20');
    const data = (await list.json()) as { items: Array<{ name: string }> };
    const names = data.items.map((i) => i.name);
    expect(names).toEqual(
      expect.arrayContaining(['Aurora Light', 'Aurora Vibrant', 'Aurora Editorial']),
    );
  });

  it('second run with a different key skips all (no duplicate records)', async () => {
    const r1 = await app.request('/templates/seed', {
      method: 'POST',
      headers: seedHeaders('templates-second-a'),
    });
    expect(r1.status).toBe(201);
    const r2 = await app.request('/templates/seed', {
      method: 'POST',
      headers: seedHeaders('templates-second-b'),
    });
    expect(r2.status).toBe(201);
    const body = (await r2.json()) as { inserted: number; skipped: number };
    expect(body.skipped).toBe(3);
    expect(body.inserted).toBe(0);

    const list = await app.request('/templates?limit=20');
    const items = (await list.json()) as { items: unknown[] };
    expect(items.items.length).toBe(3);
  });

  it('5x concurrent same-key calls collapse into a single insert (3 records, never 15)', async () => {
    const headers = seedHeaders('templates-concurrent-race');
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        app.request('/templates/seed', { method: 'POST', headers }),
      ),
    );
    const bodies = (await Promise.all(responses.map((r) => r.json()))) as Array<{
      alreadyExists?: boolean;
    }>;
    expect(bodies.filter((b) => !b.alreadyExists).length).toBe(1);
    expect(bodies.filter((b) => b.alreadyExists).length).toBe(4);

    // Repository holds exactly 3, never 3×5 = 15.
    const list = await app.request('/templates?limit=20');
    const items = (await list.json()) as { items: unknown[] };
    expect(items.items.length).toBe(3);
  });

  it('partial failure (one create throws) reports failed > 0 without crashing', async () => {
    let calls = 0;
    const original = templatesFake.create.bind(templatesFake);
    templatesFake.create = async (input) => {
      calls += 1;
      if (calls === 2) throw new Error('upstream rate limit');
      return original(input);
    };

    const res = await app.request('/templates/seed', {
      method: 'POST',
      headers: seedHeaders('templates-partial-failure'),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      inserted: number;
      failed: number;
      failures: Array<{ name: string; error: string }>;
    };
    expect(body.failed).toBe(1);
    expect(body.inserted).toBe(2);
    expect(body.failures.length).toBe(1);
    expect(body.failures[0]?.error).toContain('rate limit');
  });

  it('vendor identifiers in error messages are sanitised in the response body', async () => {
    templatesFake.create = async () => {
      throw new Error('Airtable HTTP 404 / bucket.s3.amazonaws.com timeout / AWS S3');
    };
    const res = await app.request('/templates/seed', {
      method: 'POST',
      headers: seedHeaders('templates-sanitiser'),
    });
    expect(res.status).toBe(201);
    const text = await res.text();
    const lower = text.toLowerCase();
    expect(lower).not.toContain('airtable');
    expect(lower).not.toContain('aws');
    expect(lower).not.toContain('amazonaws');
    expect(lower.includes('upstream')).toBe(true);
  });
});
