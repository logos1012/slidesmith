// templates.ts — /templates CRUD (SPEC §5-3).
// Cycle 2: PATCH /:id/usage hot path is exposed for usage_count incrementUsage.
// v1.1.2: POST /templates/seed — onboarding default Templates upsert (Aurora
// Light / Vibrant / Editorial). Always idempotent: running it twice keeps
// Templates at N records, never 2N. Mirrors POST /knowledge/seed exactly so
// Idempotency-Key handling, Korean userMessage on missing header, and the
// alreadyExists wire shape are identical for the wizard.
import { Hono } from 'hono';
import { z } from 'zod';
import { getRepos } from '../repositories/container.js';
import { logger } from '../lib/logger.js';
import { seedTemplates } from '../seed/seed-templates-service.js';
import { acquireOrCreate } from '../lib/idempotency.js';
import type { TemplatesSeedReport } from '../seed/seed-templates-service.js';

export const templates = new Hono();

const ListQuery = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const CreateBody = z.object({
  name: z.string().min(1),
  schema: z.unknown().optional(),
  narrativeArc: z.string().optional(),
  files: z.array(z.string()).optional(),
  version: z.string().optional(),
  usageCount: z.number().int().min(0).optional(),
});

const PatchBody = CreateBody.partial();

// v1.1.2 — onboarding default Templates seed import. Body is empty (the bundle
// ships in the image at src/seed/templates-default.json). Idempotency-Key is
// MANDATORY for the same reason as /knowledge/seed (Cycle 3 Fix F1): without
// it, two storage instances or two concurrent same-instance calls would each
// see a name miss in the in-memory dedup cache and create the bundle twice.
//
// Registered ABOVE `/:id` so the literal path wins over the param matcher.
templates.post('/seed', async (c) => {
  const idemKey = c.req.header('Idempotency-Key') ?? c.req.header('idempotency-key');
  if (!idemKey || idemKey.trim() === '') {
    return c.json(
      {
        error: 'missing_idempotency_key',
        message: 'Idempotency-Key header is required for /templates/seed',
        userMessage:
          '템플릿 가져오기는 Idempotency-Key 헤더가 필요합니다. 마법사를 다시 시작해주세요.',
      },
      400,
    );
  }

  const factory = (): Promise<TemplatesSeedReport> =>
    seedTemplates(getRepos().templates);

  try {
    const hit = await acquireOrCreate<TemplatesSeedReport>(
      'templates-seed',
      idemKey,
      factory,
    );
    return c.json(
      hit.alreadyExists ? { ...hit.value, alreadyExists: true } : hit.value,
      hit.alreadyExists ? 200 : 201,
    );
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'templates_seed_failed');
    return c.json(
      {
        error: 'seed_failed',
        message: 'failed to import templates seed',
        userMessage: '템플릿 가져오기에 실패했습니다. 잠시 후 다시 시도해주세요.',
      },
      502,
    );
  }
});

templates.get('/', async (c) => {
  const parsed = ListQuery.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!parsed.success) {
    return c.json({ error: 'invalid_query', issues: parsed.error.issues }, 400);
  }
  try {
    const page = await getRepos().templates.list(parsed.data);
    return c.json(page);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'templates_list_failed');
    return c.json({ items: [], total: 0, hasMore: false, degraded: true }, 200);
  }
});

templates.get('/:id', async (c) => {
  const item = await getRepos().templates.get(c.req.param('id'));
  if (!item) return c.json({ error: 'not_found' }, 404);
  return c.json(item);
});

templates.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const item = await getRepos().templates.create(parsed.data);
  return c.json(item, 201);
});

templates.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  try {
    const item = await getRepos().templates.update(c.req.param('id'), parsed.data);
    return c.json(item);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return c.json({ error: 'not_found' }, 404);
    throw err;
  }
});

const UsageBody = z.object({ by: z.number().int().min(1).max(1000).default(1) });

templates.patch('/:id/usage', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = UsageBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  try {
    const item = await getRepos().templates.incrementUsage(c.req.param('id'), parsed.data.by);
    return c.json(item);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return c.json({ error: 'not_found' }, 404);
    throw err;
  }
});

templates.delete('/:id', async (c) => {
  const ok = await getRepos().templates.delete(c.req.param('id'));
  if (!ok) return c.json({ error: 'not_found' }, 404);
  return c.body(null, 204);
});
