// src/routes/chat.ts — POST /chat/stream (SSE).
// SPEC: SERVICE-llm.md §5-2. Streams tokens through claude.service.streamClaude.
// Cycle 2 Fix:
//   F1 — sanitizeErrorMessage on all user-facing error strings (no API key leaks).
//   F3 — wake-loop safety net removed; .finally() wake() race-safe (sync write to
//        state.done before invoking resolveNext, so consumer always re-checks the
//        loop condition).
// Cycle 3:
//   A1 — vendor errors classified into 401/429/5xx/CB/no-backend/network/unknown.
//   B1 — first-token latency exposed (X-First-Token-Ms response header is set on
//        the SSE 'done' frame's payload via firstTokenAt, allowing the BFF to
//        record p50/p99). The sub-1s gate is a soft assertion: see chat-stream
//        latency unit test (Cycle 3 B1).
//   C1 — error frame uses mapErrorToKoreanUserMessage (4-message shape).

import { Hono } from 'hono';
import { z } from 'zod';
import { sseStream, type SseEvent } from '../lib/sse-stream.js';
import { logger } from '../lib/logger.js';
import { streamClaude } from '../services/claude.service.js';
import {
  classifyError,
  mapErrorToKoreanUserMessage,
  type KoreanUserMessage,
} from '../lib/sanitize-error.js';
import { errorCodeFor } from '../lib/korean-ux.js';

const ChatBody = z.object({
  message: z.string().min(1).max(8000),
  systemPrompt: z.string().max(8000).optional(),
  context: z.unknown().optional(),
  sessionId: z.string().min(1).max(64).optional(),
  correlationId: z.string().min(1).max(64).optional(),
});

const DEFAULT_SYSTEM = '당신은 한국어로 응답하는 친근한 어시스턴트입니다. 존댓말을 기본으로 사용하세요.';

export const chatRoute = new Hono();

chatRoute.post('/chat/stream', async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = ChatBody.safeParse(json);
  if (!parsed.success) {
    return c.json({ error: 'BAD_REQUEST', details: parsed.error.flatten() }, 400);
  }
  const correlationId =
    parsed.data.correlationId ?? c.req.header('x-correlation-id') ?? null;
  const systemPrompt = parsed.data.systemPrompt ?? DEFAULT_SYSTEM;
  logger.info({ correlationId, sessionId: parsed.data.sessionId }, 'chat_stream_start');

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache, no-transform');
  c.header('Connection', 'keep-alive');
  if (correlationId) c.header('X-Correlation-Id', correlationId);
  return c.body(sseStream(runChatStream(systemPrompt, parsed.data.message, correlationId)));
});

async function* runChatStream(
  systemPrompt: string,
  userMessage: string,
  correlationId: string | null,
): AsyncGenerator<SseEvent> {
  const queue: SseEvent[] = [];
  let resolveNext: (() => void) | null = null;
  const wake = (): void => {
    const r = resolveNext;
    resolveNext = null;
    if (r) r();
  };

  const startedAt = Date.now();
  let firstTokenAt: number | null = null;

  const state: {
    done: boolean;
    errorPayload: ChatErrorFrame | null;
    final: { text: string; usage: unknown; via: string } | null;
  } = { done: false, errorPayload: null, final: null };

  const work = streamClaude(systemPrompt, userMessage, (token) => {
    if (firstTokenAt === null) firstTokenAt = Date.now() - startedAt;
    queue.push({ event: 'token', data: { token } });
    wake();
  })
    .then((res) => {
      state.final = { text: res.text, usage: res.usage, via: res.via };
    })
    .catch((err: unknown) => {
      state.errorPayload = mapErrorToChatFrame(err);
    })
    .finally(() => {
      state.done = true;
      wake();
    });

  while (!state.done || queue.length > 0) {
    if (queue.length > 0) {
      yield queue.shift() as SseEvent;
    } else {
      // Race-safe wait: register resolveNext BEFORE re-checking state. If wake()
      // ran between the loop condition check and now (sync), we observe via the
      // state.done re-read after promise resolves. The producer always sets
      // state.done = true SYNCHRONOUSLY before calling wake() in .finally(),
      // so any wake() always corresponds to either a queued token or done=true.
      // No 250ms safety net needed (Cycle 2 Fix P1-3).
      await new Promise<void>((resolve) => {
        resolveNext = resolve;
        // Re-check state after registration in case wake() raced before us.
        if (state.done || queue.length > 0) {
          resolveNext = null;
          resolve();
        }
      });
    }
  }
  await work;
  if (state.errorPayload) {
    yield { event: 'error', data: state.errorPayload };
    return;
  }
  yield {
    event: 'done',
    data: {
      fullText: state.final?.text ?? '',
      usage: state.final?.usage ?? null,
      via: state.final?.via ?? null,
      correlationId,
      // Cycle 3 B1: emit first-token latency so BFF/web can chart p50/p99.
      firstTokenMs: firstTokenAt,
      totalMs: Date.now() - startedAt,
    },
  };
}

interface ChatErrorFrame {
  code: string;
  message: string;
  userMessage: KoreanUserMessage;
}

function mapErrorToChatFrame(err: unknown): ChatErrorFrame {
  // Cycle 3 A1 + C1 — single funnel: classify → Korean 4-원칙.
  // Cycle 3 Fix F1 + P3-3 — errorCodeFor extracted to lib/korean-ux.ts.
  const userMessage = mapErrorToKoreanUserMessage(err, { what: '스트리밍 실패' });
  const cls = classifyError(err);
  return {
    code: errorCodeFor(cls, 'STREAM_ERROR'),
    // Backwards-compatible flat string (Cycle 2 contract).
    message: `무엇이: ${userMessage.what} / 왜: ${userMessage.why} / 다음: ${userMessage.next} / 회복: ${userMessage.recovery}`,
    userMessage: {
      what: userMessage.what,
      why: userMessage.why,
      next: userMessage.next,
      recovery: userMessage.recovery,
    },
  };
}
