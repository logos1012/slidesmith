// /api/chat/stream — SSE BFF relay → llm /chat/stream (SERVICE-web.md §5-4)
// Cycle 2 Fix (F2, 🟠-3): Zod 입력 검증 박제 — message 길이 상한 + sessionId 박제.
import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/container';
import { ChatStreamInputSchema } from '@/lib/schemas/chat-stream-input.schema';
import { parseOr400 } from '@/lib/schemas/parse-or-400';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = parseOr400(raw, ChatStreamInputSchema, '/api/chat/stream');
  if (!parsed.ok) return parsed.response;
  const c = getContainer();
  try {
    const upstream = await c.llm.chatStream({
      message: parsed.data.message,
      sessionId: parsed.data.sessionId,
      ...(parsed.data.context !== undefined ? { context: parsed.data.context } : {}),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
    });
  } catch (err) {
    return new Response(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`, {
      status: 502,
      headers: { 'content-type': 'text/event-stream' },
    });
  }
}
