// cursor-pagination.test.ts — Cycle 3 §B: cursor + Link header for 1000+ rows.
// Verified against both /knowledge (offset-encoded cursor) and /carousels
// (opaque repository cursor). Mirrors the SPEC §5-2 / §5-4 contract.
import './_setup.js';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { Hono } from 'hono';

let app: Hono;
let fakes: typeof import('../fakes/in-memory-repos.js');
let container: typeof import('../../src/repositories/container.js');

beforeAll(async () => {
  fakes = await import('../fakes/in-memory-repos.js');
  container = await import('../../src/repositories/container.js');
  const mod = await import('../../src/server.js');
  app = mod.app;
});

beforeEach(() => {
  container.setRepos({
    knowledge: new fakes.FakeKnowledgeRepo(),
    carousels: new fakes.FakeCarouselRepo(),
  });
});

async function seedManyKnowledge(n: number): Promise<void> {
  // Use the test-only fake directly to avoid the seed bundle limit.
  const repo = container.getRepos().knowledge;
  for (let i = 0; i < n; i += 1) {
    await repo.create({
      name: `Item${String(i).padStart(4, '0')}`,
      // alternate categories so SPEC §5-2 enums stay realistic
      category: i % 2 === 0 ? 'Frameworks' : 'Hooks',
      description: `desc-${i}`,
    });
  }
}

async function seedManyCarousels(n: number): Promise<void> {
  const repo = container.getRepos().carousels;
  for (let i = 0; i < n; i += 1) {
    await repo.create({ title: `c-${i}`, seriesId: i % 100 === 0 ? 'pivot' : null });
  }
}

describe('GET /knowledge — cursor pagination + Link header', () => {
  it('paginates through 1000 items in 50-row pages without dupes or gaps', async () => {
    await seedManyKnowledge(1000);

    const seen = new Set<string>();
    let url = '/knowledge?limit=50';
    let pageCount = 0;
    while (true) {
      const res = await app.request(url);
      expect(res.status).toBe(200);
      pageCount += 1;
      const body = (await res.json()) as {
        items: Array<{ name: string }>;
        nextCursor: string | null;
      };
      for (const item of body.items) {
        expect(seen.has(item.name)).toBe(false);
        seen.add(item.name);
      }

      if (body.nextCursor === null) break;
      // Cursor variant — Link header MUST point at the same page we'd hit
      // by setting ?cursor=<nextCursor>.
      const link = res.headers.get('Link');
      expect(link).toMatch(/rel="next"/);
      url = `/knowledge?limit=50&cursor=${encodeURIComponent(body.nextCursor)}`;

      // Defence: never let a buggy cursor turn into an infinite loop.
      if (pageCount > 30) throw new Error('cursor pagination did not terminate');
    }
    expect(seen.size).toBe(1000);
  });

  it('rejects an unparsable cursor with HTTP 400', async () => {
    const res = await app.request('/knowledge?cursor=%21%21not-base64%21%21');
    expect(res.status).toBe(400);
  });

  it('omits Link header on the last page', async () => {
    await seedManyKnowledge(5);
    const res = await app.request('/knowledge?limit=20');
    expect(res.headers.get('Link')).toBeNull();
    const body = (await res.json()) as { nextCursor: string | null };
    expect(body.nextCursor).toBeNull();
  });
});

describe('GET /carousels — cursor pagination + Link header', () => {
  it('paginates through 1000 carousels with Link header on every non-final page', async () => {
    await seedManyCarousels(1000);

    let cursor: string | null = null;
    let pages = 0;
    let total = 0;
    while (true) {
      const url = cursor
        ? `/carousels?limit=50&cursor=${encodeURIComponent(cursor)}`
        : '/carousels?limit=50';
      const res = await app.request(url);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        items: unknown[];
        nextCursor: string | null;
      };
      total += body.items.length;
      pages += 1;
      if (body.nextCursor === null) {
        // Link header dropped on the final page.
        expect(res.headers.get('Link')).toBeNull();
        break;
      }
      expect(res.headers.get('Link')).toMatch(/rel="next"/);
      cursor = body.nextCursor;
      if (pages > 30) throw new Error('carousels pagination did not terminate');
    }
    expect(total).toBe(1000);
    expect(pages).toBe(20);
  });
});
