// lib/schemas/content-input.schema.ts — /api/content/generate 입력 (Cycle 3 A6)
import { z } from 'zod';
import { AspectRatioSchema } from './common';

export const ContentGenerateInputSchema = z.object({
  brief: z.string().min(1).max(2000),
  templateId: z.string().min(1).max(128).optional(),
  ratio: AspectRatioSchema,
  slideCount: z.number().int().min(1).max(20),
});

export type ContentGenerateInputDto = z.infer<typeof ContentGenerateInputSchema>;
