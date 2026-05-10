// elements.ts — /elements CRUD (SPEC §5-5).
// 4 element types: character / background / prop / style.
import { Hono } from 'hono';
import { z } from 'zod';
import { getRepos } from '../repositories/container.js';
import { logger } from '../lib/logger.js';

export const elements = new Hono();

const ElementTypes = ['character', 'background', 'prop', 'style'] as const;

const ListQuery = z.object({
  type: z.enum(ElementTypes).optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const CreateBody = z.object({
  type: z.enum(ElementTypes),
  name: z.string().min(1),
  src: z.string().min(1),
  aliases: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const PatchBody = CreateBody.partial();

elements.get('/', async (c) => {
  const parsed = ListQuery.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!parsed.success) {
    return c.json({ error: 'invalid_query', issues: parsed.error.issues }, 400);
  }
  try {
    const page = await getRepos().elements.list(parsed.data);
    return c.json(page);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'elements_list_failed');
    return c.json({ items: [], total: 0, hasMore: false, degraded: true }, 200);
  }
});

elements.get('/:id', async (c) => {
  const item = await getRepos().elements.get(c.req.param('id'));
  if (!item) return c.json({ error: 'not_found' }, 404);
  return c.json(item);
});

elements.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const item = await getRepos().elements.create(parsed.data);
  return c.json(item, 201);
});

elements.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  try {
    const item = await getRepos().elements.update(c.req.param('id'), parsed.data);
    return c.json(item);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return c.json({ error: 'not_found' }, 404);
    throw err;
  }
});

elements.delete('/:id', async (c) => {
  const ok = await getRepos().elements.delete(c.req.param('id'));
  if (!ok) return c.json({ error: 'not_found' }, 404);
  return c.body(null, 204);
});
