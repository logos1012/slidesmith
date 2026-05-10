// lib/schemas/chat-stream-input.schema.ts — /api/chat/stream POST 입력 검증
// Cycle 2 Fix (F2, 🟠-3): message 길이 상한 (DoS 방지) + sessionId 박제.
//   XSS payload escape는 SSE relay 본질상 LLM 측 책임 (web은 그대로 통과).
//   다만 길이 상한 + 형식 거절은 web BFF가 담당.
import { z } from 'zod';
import { SessionIdSchema } from './common';

export const ChatStreamInputSchema = z.object({
  message: z.string().min(1).max(8000),
  context: z.string().max(20_000).optional(),
  sessionId: SessionIdSchema,
});

export type ChatStreamInputDto = z.infer<typeof ChatStreamInputSchema>;
