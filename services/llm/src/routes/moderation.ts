// src/routes/moderation.ts — POST /moderation/check
// SPEC: SERVICE-llm.md §5-5, §10.

import { Hono } from 'hono';
import { z } from 'zod';
import { checkModeration } from '../services/moderation.service.js';

const SensitiveTopicSchema = z.object({
  category: z.string().min(1).max(60),
  keywords: z.array(z.string().min(1).max(60)).min(1).max(50),
});
const ModerationBody = z.object({
  text: z.string().min(1).max(8000),
  sensitiveTopics: z.array(SensitiveTopicSchema).max(50).optional(),
});

export const moderationRoute = new Hono();

moderationRoute.post('/moderation/check', async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = ModerationBody.safeParse(json);
  if (!parsed.success) {
    return c.json({ error: 'BAD_REQUEST', details: parsed.error.flatten() }, 400);
  }
  const result = checkModeration({
    text: parsed.data.text,
    sensitiveTopics: parsed.data.sensitiveTopics,
  });
  return c.json(result, 200);
});
