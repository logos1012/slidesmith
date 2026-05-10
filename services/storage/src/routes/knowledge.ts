// knowledge.ts — /knowledge CRUD (SPEC §5-2).
// Cycle 2: full CRUD wired to IKnowledgeRepo via the container. The 5-min
// lru-cache lives in lib/airtable-client (transparent to this file).
// Cycle 3: POST /knowledge/seed — onboarding 51-item upsert (PRD §5-2 v1.0
// distribution Frameworks 10 / Hooks 15 / Narratives 7 / BrandVoice 1 /
// KoreanPatterns 8 / SensitiveTopics 10). Always idempotent: running it twice
// keeps Knowledge at 51 records, never 102.
import { Hono } from 'hono';
import { z } from 'zod';
import { getRepos } from '../repositories/container.js';
import { logger } from '../lib/logger.js';
import { seedKnowledge } from '../seed/seed-service.js';
import { acquireOrCreate } from '../lib/idempotency.js';
import type { SeedReport } from '../seed/seed-service.js';

export const knowledge = new Hono();

const Categories = [
  'Frameworks',
  'Psychology',
  'Hooks',
  'Narratives',
  'BrandVoice',
  'KoreanPatterns',
  'SensitiveTopics',
] as const;

const ListQuery = z.object({
  category: z.enum(Categories).optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  // Cycle 3 §B — opaque cursor variant for forward-only pagination on >1000 row
  // tables. When present, takes precedence over `offset`. Format: opaque base64
  // (offset is decoded back to a number; future cursors may carry richer state).
  cursor: z.string().optional(),
});

const CreateBody = z.object({
  name: z.string().min(1),
  category: z.enum(Categories),
  description: z.string().optional(),
  whenToUse: z.string().optional(),
  structure: z.string().optional(),
  examples: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const PatchBody = CreateBody.partial();

// SPEC §5-2 onboarding seed import (Cycle 3 §A).
//
// Body is empty — the bundle is shipped in the image at
// src/seed/knowledge-51.json.
//
// Cycle 3 Fix F1 (Review §M1): Idempotency-Key is now MANDATORY. Without it,
// two storage instances (or two concurrent same-instance calls) would each see
// a name-category miss in the in-memory dedup cache and create 51 records
// twice — Knowledge would balloon to 102. Forcing the header pushes that
// guarantee onto the caller's contract: the onboarding wizard already has a
// stable per-workspace ID and can derive `seed-bundle:v1.0.0:<wsId>`. Returning
// 400 with a Korean userMessage tells the user (or the wizard's developer)
// exactly what went wrong before any data is written.
knowledge.post('/seed', async (c) => {
  const idemKey = c.req.header('Idempotency-Key') ?? c.req.header('idempotency-key');
  if (!idemKey || idemKey.trim() === '') {
    return c.json(
      {
        error: 'missing_idempotency_key',
        message: 'Idempotency-Key header is required for /knowledge/seed',
        userMessage: '시드 가져오기는 Idempotency-Key 헤더가 필요합니다. 마법사를 다시 시작해주세요.',
      },
      400,
    );
  }

  const factory = (): Promise<SeedReport> => seedKnowledge(getRepos().knowledge);

  try {
    const hit = await acquireOrCreate<SeedReport>('knowledge-seed', idemKey, factory);
    return c.json(
      hit.alreadyExists ? { ...hit.value, alreadyExists: true } : hit.value,
      hit.alreadyExists ? 200 : 201,
    );
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'knowledge_seed_failed');
    return c.json(
      {
        error: 'seed_failed',
        message: 'failed to import knowledge seed',
        userMessage: '시드 가져오기에 실패했습니다. 잠시 후 다시 시도해주세요.',
      },
      502,
    );
  }
});

// Cursor codec: opaque base64 of `offset:N`. Keeps the wire format inert while
// letting the storage layer evolve to richer cursors (e.g. Airtable `offset`
// token) without breaking existing clients (Cycle 3 §B).
function decodeCursor(cursor: string | undefined): number | null {
  if (!cursor) return null;
  try {
    const text = Buffer.from(cursor, 'base64').toString('utf-8');
    const m = /^offset:(\d+)$/.exec(text);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

function encodeCursor(offset: number): string {
  return Buffer.from(`offset:${offset}`, 'utf-8').toString('base64');
}

knowledge.get('/', async (c) => {
  const parsed = ListQuery.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!parsed.success) {
    return c.json({ error: 'invalid_query', issues: parsed.error.issues }, 400);
  }
  const args = { ...parsed.data };
  // Cursor wins over offset; decode failure -> 400 so clients catch typos
  // immediately instead of silently restarting from 0.
  if (parsed.data.cursor !== undefined) {
    const decoded = decodeCursor(parsed.data.cursor);
    if (decoded === null) {
      return c.json({ error: 'invalid_query', message: 'unparsable cursor' }, 400);
    }
    args.offset = decoded;
  }
  try {
    const page = await getRepos().knowledge.list(args);
    const nextOffset = args.offset + args.limit;
    const nextCursor = page.hasMore ? encodeCursor(nextOffset) : null;
    // RFC 5988 Link header — Cycle 3 §B SPEC `Link: <...>; rel="next"`.
    if (nextCursor) {
      const url = new URL(c.req.url);
      url.searchParams.set('cursor', nextCursor);
      url.searchParams.delete('offset');
      c.header('Link', `<${url.pathname}${url.search}>; rel="next"`);
    }
    return c.json({ ...page, nextCursor });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'knowledge_list_failed');
    return c.json(
      { items: [], total: 0, hasMore: false, nextCursor: null, degraded: true },
      200,
    );
  }
});

knowledge.get('/:id', async (c) => {
  const item = await getRepos().knowledge.get(c.req.param('id'));
  if (!item) return c.json({ error: 'not_found' }, 404);
  return c.json(item);
});

knowledge.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const item = await getRepos().knowledge.create(parsed.data);
  return c.json(item, 201);
});

knowledge.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  try {
    const item = await getRepos().knowledge.update(c.req.param('id'), parsed.data);
    return c.json(item);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return c.json({ error: 'not_found' }, 404);
    throw err;
  }
});

knowledge.delete('/:id', async (c) => {
  const ok = await getRepos().knowledge.delete(c.req.param('id'));
  if (!ok) return c.json({ error: 'not_found' }, 404);
  return c.body(null, 204);
});
