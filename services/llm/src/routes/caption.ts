// src/routes/caption.ts — POST /caption/generate
// SPEC: SERVICE-llm.md §5-4.
// Cycle 3 A2: brandDsl (voice/tone/forbidden/signature) + platform inputs.

import { Hono } from 'hono';
import { z } from 'zod';
import { generateCaption } from '../services/caption.service.js';

const SlideSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(500).optional(),
  caption: z.string().max(200).optional(),
});

const BrandDslSchema = z.object({
  voice: z.string().max(20).optional(),
  tone: z.enum(['formal', 'informal']).optional(),
  forbiddenPhrases: z.array(z.string().min(1).max(60)).max(20).optional(),
  signaturePhrases: z.array(z.string().min(1).max(60)).max(10).optional(),
});

const CaptionBody = z.object({
  slides: z.array(SlideSchema).min(1).max(20),
  hashtagSeed: z.array(z.string().max(40)).max(60).optional(),
  signaturePhrases: z.array(z.string().max(40)).max(10).optional(),
  brandDsl: BrandDslSchema.optional(),
  platform: z.enum(['instagram', 'linkedin', 'threads']).optional(),
});

export const captionRoute = new Hono();

captionRoute.post('/caption/generate', async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = CaptionBody.safeParse(json);
  if (!parsed.success) {
    return c.json({ error: 'BAD_REQUEST', details: parsed.error.flatten() }, 400);
  }
  const result = generateCaption(parsed.data);
  return c.json(result, 200);
});
