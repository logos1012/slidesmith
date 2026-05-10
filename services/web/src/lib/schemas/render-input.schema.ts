// lib/schemas/render-input.schema.ts — /api/render POST 입력 검증
// Cycle 2 Fix (F2, 🟠-2): ratio enum / brand DSL color 형식 / slide shape 모두 박제.
import { z } from 'zod';
import {
  AspectRatioSchema,
  BrandDslSchema,
  ContentSlideSchema,
} from './common';

export const RenderInputSchema = z.object({
  templateId: z.string().min(1).max(128),
  ratio: AspectRatioSchema,
  slides: z.array(ContentSlideSchema).min(1).max(20),
  brand: BrandDslSchema.optional(),
  watermark: z.boolean().optional(),
});

export type RenderInputDto = z.infer<typeof RenderInputSchema>;
