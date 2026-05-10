// lib/schemas/persist-input.schema.ts — /api/save POST 입력 검증
// Cycle 2 Fix (F2, 🟠-1): ratio enum / platform enum / slides shape /
//   idempotencyKey 길이 모두 입구에서 거절. Saga 진입 전 차단.
import { z } from 'zod';
import {
  AspectRatioSchema,
  ContentSlideSchema,
  IdempotencyKeySchema,
  PlatformSchema,
  SessionIdSchema,
} from './common';

export const PersistInputSchema = z.object({
  sessionId: SessionIdSchema,
  templateId: z.string().min(1).max(128),
  ratio: AspectRatioSchema,
  platform: PlatformSchema,
  slides: z.array(ContentSlideSchema).min(1).max(20),
  watermark: z.boolean().optional(),
  idempotencyKey: IdempotencyKeySchema,
});

export type PersistInputDto = z.infer<typeof PersistInputSchema>;
