// /api/content/generate — Cycle 3 A6: BFF → llm `/content/generate`.
//   Step 3 (본문 생성) 실 호출. mock 제거.
import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/container';
import { ContentGenerateInputSchema } from '@/lib/schemas/content-input.schema';
import { parseOr400 } from '@/lib/schemas/parse-or-400';
import type { ContentGenerateInput } from '@/repositories/interfaces/ILlmGateway';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = parseOr400(raw, ContentGenerateInputSchema, '/api/content/generate');
  if (!parsed.ok) {
    logger.warn({ route: '/api/content/generate' }, 'content/generate: invalid input rejected');
    return parsed.response;
  }
  try {
    const result = await getContainer().llm.generateContent(parsed.data as unknown as ContentGenerateInput);
    logger.info(
      { route: '/api/content/generate', slideCount: result.slides.length },
      'content/generate: ok',
    );
    return NextResponse.json(result);
  } catch (err) {
    logger.error({ route: '/api/content/generate', err: String(err) }, 'content/generate: upstream failure');
    return NextResponse.json(
      { error: 'content_unavailable', userMessage: '본문 생성 서비스 일시 장애입니다. 잠시 후 다시 시도해 주세요.', detail: String(err) },
      { status: 502 },
    );
  }
}
