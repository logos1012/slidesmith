// src/routes/content.ts — POST /content/generate
// SPEC: SERVICE-llm.md §5-3.
// Cycle 2 Fix:
//   F1 — sanitizeErrorMessage on userMessage.why (no API key prefix leak).
//   F4 — CB-open responses return 503; other vendor 5xx → 502.
// Cycle 3:
//   A1 — vendor errors classified into 401/429/5xx/CB/no-backend/network/unknown.
//   C1 — userMessage uses unified 4-원칙 (mapErrorToKoreanUserMessage).
//   C2 — explicit Korean response default (already handled by content.service prompt).
// Cycle 3 Fix F1:
//   Single funnel via respondWithKoreanError — Phase 6 contract enforcement.

import { Hono } from 'hono';
import { z } from 'zod';
import { generateContent } from '../services/content.service.js';
import { logger } from '../lib/logger.js';
import { classifyError } from '../lib/sanitize-error.js';
import { errorCodeFor, respondWithKoreanError } from '../lib/korean-ux.js';

const ContentBody = z.object({
  topic: z.string().min(1).max(500),
  slideCount: z.number().int().min(3).max(10).default(5),
  tone: z.string().max(120).optional(),
  language: z.enum(['ko', 'en']).optional(),
});

export const contentRoute = new Hono();

contentRoute.post('/content/generate', async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = ContentBody.safeParse(json);
  if (!parsed.success) {
    return c.json({ error: 'BAD_REQUEST', details: parsed.error.flatten() }, 400);
  }
  try {
    const result = await generateContent(parsed.data);
    return c.json(result, 200);
  } catch (err) {
    const cls = classifyError(err);
    logger.error(
      { errorClass: cls, errorCode: errorCodeFor(cls, 'CONTENT_GEN_FAILED') },
      'content_generate_failed',
    );
    return respondWithKoreanError(c, err, '콘텐츠 생성 실패', 'CONTENT_GEN_FAILED');
  }
});
