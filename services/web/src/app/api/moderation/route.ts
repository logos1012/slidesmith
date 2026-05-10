// /api/moderation — Cycle 3 A4: Moderation guard pre-flight (사용자 발행 전 체크).
//   웹 → llm /moderation/check 호출. flagged 시 Korean UX 4-원칙 메시지 반환.
//   클라이언트 (Step 5)는 이 응답으로 confirm dialog 띄움.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getContainer } from '@/lib/container';
import { parseOr400 } from '@/lib/schemas/parse-or-400';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ModerationInput = z.object({
  text: z.string().min(1).max(20_000),
  sensitiveTopics: z.array(z.string().max(200)).max(50).default([]),
});

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = parseOr400(raw, ModerationInput, '/api/moderation');
  if (!parsed.ok) {
    logger.warn({ route: '/api/moderation' }, 'moderation: invalid input rejected');
    return parsed.response;
  }
  try {
    const result = await getContainer().llm.moderate(parsed.data.text, parsed.data.sensitiveTopics ?? []);
    if (result.ok) {
      logger.info({ route: '/api/moderation', ok: true }, 'moderation: passed');
      return NextResponse.json({ ok: true, flaggedTerms: [], userMessage: null });
    }
    // Korean UX 4-원칙: 무엇이 / 왜 / 다음 / 정중.
    const userMessage =
      `검토가 필요한 표현이 발견되었습니다 (${result.flaggedTerms.slice(0, 5).join(', ')}). ` +
      `Instagram 정책 위반 위험이 있어 게시 전 확인이 필요합니다. ` +
      `본문을 수정하거나 그대로 발행할지 선택해 주세요.`;
    logger.info(
      { route: '/api/moderation', ok: false, flaggedCount: result.flaggedTerms.length },
      'moderation: flagged',
    );
    return NextResponse.json(
      { ok: false, flaggedTerms: result.flaggedTerms, guidance: result.guidance ?? null, userMessage },
      { status: 200 },
    );
  } catch (err) {
    logger.error({ route: '/api/moderation', err: String(err) }, 'moderation: upstream failure');
    return NextResponse.json(
      { error: 'moderation_unavailable', userMessage: '검토 서비스 일시 장애입니다. 잠시 후 다시 시도해 주세요.', detail: String(err) },
      { status: 502 },
    );
  }
}
