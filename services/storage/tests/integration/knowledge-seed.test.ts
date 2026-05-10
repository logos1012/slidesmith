// knowledge-seed.test.ts — Cycle 3 §A: POST /knowledge/seed imports the v1.0
// 51-item bundle exactly once (idempotent on re-run).
import './_setup.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { Hono } from 'hono';

let app: Hono;
let fakes: typeof import('../fakes/in-memory-repos.js');
let container: typeof import('../../src/repositories/container.js');
let idem: typeof import('../../src/lib/idempotency.js');
let knowledgeFake: import('../fakes/in-memory-repos.js').FakeKnowledgeRepo;

beforeAll(async () => {
  fakes = await import('../fakes/in-memory-repos.js');
  container = await import('../../src/repositories/container.js');
  idem = await import('../../src/lib/idempotency.js');
  const mod = await import('../../src/server.js');
  app = mod.app;
});

beforeEach(() => {
  knowledgeFake = new fakes.FakeKnowledgeRepo();
  container.setRepos({ knowledge: knowledgeFake });
  idem._resetIdempotency();
});

// Cycle 3 Fix F1: Idempotency-Key is mandatory on /knowledge/seed. Tests use a
// distinct key per `it` block so the LRU cache never returns a stale hit
// across cases and `acquireOrCreate` actually exercises the factory each time.
const seedHeaders = (key: string): Record<string, string> => ({
  'Idempotency-Key': key,
});

describe('POST /knowledge/seed — 51-item v1.0 bundle import', () => {
  it('rejects requests without Idempotency-Key with HTTP 400 + Korean userMessage', async () => {
    const res = await app.request('/knowledge/seed', { method: 'POST' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      message: string;
      userMessage: string;
    };
    expect(body.error).toBe('missing_idempotency_key');
    expect(body.userMessage).toContain('Idempotency-Key');
    // Korean userMessage — wizard surfaces this verbatim.
    expect(/[ㄱ-힝]/u.test(body.userMessage)).toBe(true);

    // Repository must NOT have been written to.
    const list = await app.request('/knowledge?limit=100');
    const items = (await list.json()) as { items: unknown[] };
    expect(items.items.length).toBe(0);
  });

  it('also rejects an empty Idempotency-Key (whitespace) with 400', async () => {
    const res = await app.request('/knowledge/seed', {
      method: 'POST',
      headers: { 'Idempotency-Key': '   ' },
    });
    expect(res.status).toBe(400);
  });

  it('first run inserts exactly 51 records', async () => {
    const res = await app.request('/knowledge/seed', {
      method: 'POST',
      headers: seedHeaders('seed-first-run'),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      inserted: number;
      skipped: number;
      failed: number;
      total: number;
      durationMs: number;
    };
    expect(body.total).toBe(51);
    expect(body.inserted).toBe(51);
    expect(body.skipped).toBe(0);
    expect(body.failed).toBe(0);
    expect(body.durationMs).toBeGreaterThanOrEqual(0);

    // GET /knowledge?limit=100 returns the same 51 records.
    const list = await app.request('/knowledge?limit=100');
    const items = (await list.json()) as { items: unknown[] };
    expect(items.items.length).toBe(51);
  });

  it('second run with a different key skips all 51 (no duplicate records)', async () => {
    const r1 = await app.request('/knowledge/seed', {
      method: 'POST',
      headers: seedHeaders('seed-second-run-a'),
    });
    expect(r1.status).toBe(201);
    const r2 = await app.request('/knowledge/seed', {
      method: 'POST',
      headers: seedHeaders('seed-second-run-b'),
    });
    expect(r2.status).toBe(201);
    const body = (await r2.json()) as { inserted: number; skipped: number };
    expect(body.skipped).toBe(51);
    expect(body.inserted).toBe(0);

    // Repository still holds 51, not 102.
    const list = await app.request('/knowledge?limit=100');
    const items = (await list.json()) as { items: unknown[] };
    expect(items.items.length).toBe(51);
  });

  it('Idempotency-Key collapses concurrent imports into one (4x same key)', async () => {
    const headers = seedHeaders('seed-onboarding-concurrent');
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        app.request('/knowledge/seed', { method: 'POST', headers }),
      ),
    );
    const bodies = (await Promise.all(responses.map((r) => r.json()))) as Array<{
      inserted: number;
      skipped: number;
      alreadyExists?: boolean;
    }>;
    const created = bodies.filter((b) => !b.alreadyExists);
    const shared = bodies.filter((b) => b.alreadyExists);
    expect(created.length).toBe(1);
    expect(shared.length).toBe(3);
    // Single import path actually ran — Knowledge holds 51.
    const list = await app.request('/knowledge?limit=100');
    const items = (await list.json()) as { items: unknown[] };
    expect(items.items.length).toBe(51);
  });

  it('5x concurrent same-key calls collapse into a single insert (Cycle 3 Fix F1)', async () => {
    const headers = seedHeaders('seed-fix-f1-race');
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        app.request('/knowledge/seed', { method: 'POST', headers }),
      ),
    );
    const bodies = (await Promise.all(responses.map((r) => r.json()))) as Array<{
      alreadyExists?: boolean;
    }>;
    expect(bodies.filter((b) => !b.alreadyExists).length).toBe(1);
    expect(bodies.filter((b) => b.alreadyExists).length).toBe(4);
    // Repository holds exactly 51 — never 51×5 = 255.
    const list = await app.request('/knowledge?limit=100');
    const items = (await list.json()) as { items: unknown[] };
    expect(items.items.length).toBe(51);
  });

  it('seed import is fast — completes well under the SPEC §13 30s budget', async () => {
    const start = Date.now();
    const res = await app.request('/knowledge/seed', {
      method: 'POST',
      headers: seedHeaders('seed-budget'),
    });
    expect(res.status).toBe(201);
    expect(Date.now() - start).toBeLessThan(5_000); // in-memory fake
  });

  it('inserts respect the PRD distribution (Frameworks 10 / Hooks 15 / ...)', async () => {
    await app.request('/knowledge/seed', {
      method: 'POST',
      headers: seedHeaders('seed-distribution'),
    });

    const counts: Record<string, number> = {};
    for (const cat of [
      'Frameworks',
      'Hooks',
      'Narratives',
      'BrandVoice',
      'KoreanPatterns',
      'SensitiveTopics',
    ]) {
      const r = await app.request(`/knowledge?category=${cat}&limit=100`);
      const body = (await r.json()) as { items: unknown[] };
      counts[cat] = body.items.length;
    }
    expect(counts).toEqual({
      Frameworks: 10,
      Hooks: 15,
      Narratives: 7,
      BrandVoice: 1,
      KoreanPatterns: 8,
      SensitiveTopics: 10,
    });
  });

  it('partial failure (one create throws) reports failed > 0 without crashing', async () => {
    // Wrap fake to inject a failure on the 5th item.
    let calls = 0;
    const original = knowledgeFake.create.bind(knowledgeFake);
    knowledgeFake.create = async (input) => {
      calls += 1;
      if (calls === 5) throw new Error('upstream rate limit');
      return original(input);
    };

    const res = await app.request('/knowledge/seed', {
      method: 'POST',
      headers: seedHeaders('seed-partial-failure'),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      inserted: number;
      failed: number;
      failures: Array<{ name: string; error: string }>;
    };
    expect(body.failed).toBe(1);
    expect(body.inserted).toBe(50);
    expect(body.failures.length).toBe(1);
    expect(body.failures[0]?.error).toContain('rate limit');
  });

  // Cycle 3 §F — failure messages must not leak vendor names through the
  // boundary even when upstream errors look like "Airtable HTTP 404 /
  // ...s3.amazonaws.com timeout". Cycle 3 Fix L1 specifically extends the
  // sanitiser to cover `amazonaws` (host name suffix).
  it('vendor identifiers in error messages are sanitised in the response body', async () => {
    knowledgeFake.create = async () => {
      throw new Error('Airtable HTTP 404 / bucket.s3.amazonaws.com timeout / AWS S3');
    };
    const res = await app.request('/knowledge/seed', {
      method: 'POST',
      headers: seedHeaders('seed-sanitiser'),
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
