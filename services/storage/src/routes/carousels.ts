// carousels.ts — /carousels CRUD (SPEC §5-4).
// Day 1 schema = 11 forward-compat fields (ARCH §3-8 / §14.7-15) so series /
// repurpose / post-save edit features land with zero v1.1·v1.5 migration.
// POST is idempotent (24h LRU; web BFF Saga is the authoritative ledger).
//
// Cycle 2 Fix:
//  - F2 (Review §H2): POST goes through acquireOrCreate so concurrent calls
//    with the same Idempotency-Key share one in-flight Promise.
//  - F3 (Review §M1): seriesVolume.min(0), lastUsedAt.datetime(),
//    moderationStatus enum, body min-1-key non-empty assertion.
import { Hono } from 'hono';
import { z } from 'zod';
import { getRepos } from '../repositories/container.js';
import { acquireOrCreate } from '../lib/idempotency.js';
import { logger } from '../lib/logger.js';
import type { Carousel } from '../types/domain.js';

export const carousels = new Hono();

// SPEC §13 forward-compat moderation lifecycle (Saga emits these states).
// Cycle 1 / Cycle 2 keep PASSED + BLOCKED + PENDING — the v1.1 Saga adds
// approved/rejected aliases. Both spellings stay accepted to avoid coupling
// the storage schema to the BFF state names mid-rollout.
const MODERATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'PENDING',
  'PASSED',
  'BLOCKED',
] as const;

const ListQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  seriesId: z.string().optional(),
  parentCarouselId: z.string().optional(),
});

// Mirror of CarouselCreate (vendor-neutral). All 11 forward-compat fields
// accepted on input even though only some emit in v1.0 (ARCH §14.7-15).
const CreateBody = z
  .object({
    title: z.string().optional(),
    brief: z.string().optional(),
    templateId: z.string().optional(),
    content: z.unknown().optional(),
    brandDSLSnapshot: z.unknown().optional(),
    hookCategory: z.string().nullable().optional(),
    narrativeArc: z.string().nullable().optional(),
    frameworksUsed: z.array(z.string()).optional(),
    s3Keys: z.array(z.string()).optional(),
    aspectRatio: z.string().optional(),
    watermarkEnabled: z.boolean().optional(),
    templateSchemaVersion: z.string().optional(),
    // 11 forward-compat
    seriesId: z.string().nullable().optional(),
    seriesVolume: z.number().int().min(0).nullable().optional(),
    parentCarouselId: z.string().nullable().optional(),
    repurposeType: z.string().nullable().optional(),
    moderationStatus: z.enum(MODERATION_STATUSES).nullable().optional(),
    captionJson: z.unknown().optional(),
    insightsJson: z.unknown().optional(),
    lastUsedAt: z.string().datetime().nullable().optional(),
    versionHistory: z.array(z.unknown()).optional(),
  })
  // SPEC §5-4 + Review §M1(f): an empty {} body produces an empty Airtable
  // record. POST must carry at least one identifying field.
  .refine(
    (b) =>
      b.title !== undefined ||
      b.brief !== undefined ||
      b.templateId !== undefined ||
      b.content !== undefined ||
      b.seriesId !== undefined,
    { message: 'one of title|brief|templateId|content|seriesId is required' },
  );

const PatchBody = z
  .object({
    title: z.string().optional(),
    brief: z.string().optional(),
    templateId: z.string().optional(),
    content: z.unknown().optional(),
    brandDSLSnapshot: z.unknown().optional(),
    hookCategory: z.string().nullable().optional(),
    narrativeArc: z.string().nullable().optional(),
    frameworksUsed: z.array(z.string()).optional(),
    s3Keys: z.array(z.string()).optional(),
    aspectRatio: z.string().optional(),
    watermarkEnabled: z.boolean().optional(),
    templateSchemaVersion: z.string().optional(),
    seriesId: z.string().nullable().optional(),
    seriesVolume: z.number().int().min(0).nullable().optional(),
    parentCarouselId: z.string().nullable().optional(),
    repurposeType: z.string().nullable().optional(),
    moderationStatus: z.enum(MODERATION_STATUSES).nullable().optional(),
    captionJson: z.unknown().optional(),
    insightsJson: z.unknown().optional(),
    lastUsedAt: z.string().datetime().nullable().optional(),
    versionHistory: z.array(z.unknown()).optional(),
  })
  .partial();

carousels.get('/', async (c) => {
  const parsed = ListQuery.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!parsed.success) {
    return c.json({ error: 'invalid_query', issues: parsed.error.issues }, 400);
  }
  try {
    const page = await getRepos().carousels.list(parsed.data);
    // Cycle 3 §B — RFC 5988 Link header for cursor pagination on the 1000+ row
    // case. Cursor itself is opaque (Airtable `offset` token in production,
    // numeric stride in fakes); the route just relays it back.
    if (page.nextCursor) {
      const url = new URL(c.req.url);
      url.searchParams.set('cursor', page.nextCursor);
      c.header('Link', `<${url.pathname}${url.search}>; rel="next"`);
    }
    return c.json(page);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'carousels_list_failed');
    return c.json({ items: [], nextCursor: null, degraded: true }, 200);
  }
});

// Cycle 3 §D — series fetch for v1.1 series workflow (ARCH §14.7-15:
// `series_id` read activated via storage.ICarouselRepo.listBySeries). v1.0
// emits 0 reads; this endpoint exists so v1.1 lights it up with no schema work.
// MUST be declared before `/:id` so the literal `series` segment doesn't fall
// through to the variadic id matcher.
carousels.get('/series/:seriesId', async (c) => {
  const seriesId = c.req.param('seriesId');
  const limitRaw = new URL(c.req.url).searchParams.get('limit') ?? '100';
  const limit = Math.min(Math.max(Number(limitRaw) || 100, 1), 200);
  try {
    const page = await getRepos().carousels.list({ seriesId, limit });
    return c.json({ ...page, seriesId });
  } catch (err) {
    logger.warn({ err: (err as Error).message, seriesId }, 'carousels_series_failed');
    return c.json({ items: [], nextCursor: null, seriesId, degraded: true }, 200);
  }
});

const REPURPOSE_TYPES = ['original', 'series', 'clip', 'remix', 'translation'] as const;

// Cycle 3 §D — repurpose-type lookup. Activates the `repurpose_type` 11-field
// (ARCH §14.7-15: web RepurposePanel v1.1). Type is a path segment so clients
// can bookmark `/carousels/repurpose/clip`.
carousels.get('/repurpose/:type', async (c) => {
  const type = c.req.param('type');
  if (!REPURPOSE_TYPES.includes(type as (typeof REPURPOSE_TYPES)[number])) {
    return c.json(
      {
        error: 'invalid_repurpose_type',
        message: `expected one of: ${REPURPOSE_TYPES.join(', ')}`,
      },
      400,
    );
  }
  try {
    // The list args don't yet expose `repurposeType` so we filter on the
    // returned page. For v1.0 this stays under 100 items per series; v1.1
    // will lift the predicate into the repository when usage warrants it.
    const page = await getRepos().carousels.list({ limit: 200 });
    const items = page.items.filter((c) => c.repurposeType === type);
    return c.json({ items, total: items.length, repurposeType: type });
  } catch (err) {
    logger.warn({ err: (err as Error).message, type }, 'carousels_repurpose_failed');
    return c.json({ items: [], total: 0, repurposeType: type, degraded: true }, 200);
  }
});

const ModerationBody = z.object({
  status: z.enum(MODERATION_STATUSES),
  reason: z.string().max(500).optional(),
});

// Cycle 3 §D — moderation status update. Activates `moderation_status` field
// (ARCH §14.7-15: storage Save Saga step 5 → web ModerationBlockModal). The
// 11-field row gets touched on every Save in v1.0; this endpoint lets the
// Saga PATCH it independently when downstream moderation completes async.
carousels.post('/:id/moderation', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = ModerationBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const id = c.req.param('id');
  try {
    const item = await getRepos().carousels.update(id, {
      moderationStatus: parsed.data.status,
    });
    logger.info({ id, status: parsed.data.status }, 'carousel_moderation_updated');
    return c.json({ id: item.id, moderationStatus: item.moderationStatus });
  } catch (err) {
    if ((err as { status?: number }).status === 404) return c.json({ error: 'not_found' }, 404);
    throw err;
  }
});

carousels.get('/:id', async (c) => {
  const item = await getRepos().carousels.get(c.req.param('id'));
  if (!item) return c.json({ error: 'not_found' }, 404);
  return c.json(item);
});

carousels.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  // Idempotency: header (preferred). Web BFF Saga uses the same key for
  // retries, so a duplicate POST returns the original record + 200.
  // Cycle 2 Fix F2 (Review §H2): acquireOrCreate atomically de-dupes
  // concurrent siblings — no duplicate Airtable record on Promise.all.
  const idemKey = c.req.header('Idempotency-Key') ?? c.req.header('idempotency-key');
  const factory = (): Promise<Carousel> => getRepos().carousels.create(parsed.data);

  try {
    if (idemKey) {
      const hit = await acquireOrCreate<Carousel>('carousel', idemKey, factory);
      const status = hit.alreadyExists ? 200 : 201;
      return c.json(hit.alreadyExists ? { ...hit.value, alreadyExists: true } : hit.value, status);
    }
    const item = await factory();
    return c.json(item, 201);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'carousels_create_failed');
    throw err;
  }
});

carousels.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  try {
    const item = await getRepos().carousels.update(c.req.param('id'), parsed.data);
    return c.json(item);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return c.json({ error: 'not_found' }, 404);
    throw err;
  }
});

carousels.delete('/:id', async (c) => {
  const ok = await getRepos().carousels.delete(c.req.param('id'));
  if (!ok) return c.json({ error: 'not_found' }, 404);
  return c.body(null, 204);
});
