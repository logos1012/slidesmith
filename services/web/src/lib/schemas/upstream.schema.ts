// lib/schemas/upstream.schema.ts — 외부 (storage/llm/render) 응답 Zod (🟠-4 박제)
// Cycle 2 Fix (F3): SERVICE-web.md §8 본질 — HttpClient impl 안에서 응답 즉시 parse.
import { z } from 'zod';
import { AspectRatioSchema, PlatformSchema, ContentSlideSchema } from './common';

const UUIDSchema = z.string().min(1).max(128);
const IsoDateTimeSchema = z.string().min(1);

export const TemplateRecordSchema = z.object({
  id: UUIDSchema,
  name: z.string(),
  description: z.string(),
  ratios: z.array(AspectRatioSchema),
  thumbnailUrl: z.string().optional(),
  tags: z.array(z.string()),
});
export const TemplateListSchema = z.object({ items: z.array(TemplateRecordSchema) });
export const TemplateDetectSchema = z.object({ template: TemplateRecordSchema.nullable() });

export const KnowledgeRecordSchema = z.object({
  id: UUIDSchema,
  category: z.string(),
  name: z.string(),
  description: z.string(),
  examples: z.array(z.string()).optional(),
});
export const KnowledgeListSchema = z.object({ items: z.array(KnowledgeRecordSchema) });

export const ElementRecordSchema = z.object({
  id: UUIDSchema,
  type: z.enum(['character', 'object', 'background']),
  name: z.string(),
  url: z.string(),
  tags: z.array(z.string()),
});
export const ElementListSchema = z.object({ items: z.array(ElementRecordSchema) });

export const CarouselRecordSchema = z.object({
  id: UUIDSchema,
  title: z.string(),
  ratios: z.array(AspectRatioSchema),
  platform: PlatformSchema,
  s3Urls: z.array(z.string()),
  caption: z.string().optional(),
  createdAt: IsoDateTimeSchema,
});
export const CarouselListSchema = z.object({
  items: z.array(CarouselRecordSchema),
  nextCursor: z.string().optional(),
});

export const RenderResultSchema = z.object({
  zipUrl: z.string(),
  pngUrls: z.array(z.string()),
  durationMs: z.number(),
});

export const CaptionResultSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()),
});

export const ContentResultSchema = z.object({ slides: z.array(ContentSlideSchema) });

export const ModerationResultSchema = z.object({
  ok: z.boolean(),
  flaggedTerms: z.array(z.string()),
  guidance: z.string().optional(),
});
