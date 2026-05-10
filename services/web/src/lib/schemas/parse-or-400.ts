// lib/schemas/parse-or-400.ts — Zod safeParse → 400 with Korean userMessage
// Cycle 2 Fix (F2): DESIGN-v3 한국어 4 원칙 (무엇이 / 왜 / 다음 / 정중)을 400에 박제.
//   3 BFF route (save/render/chat-stream)에서 공통 사용.
import type { z } from 'zod';
import { NextResponse } from 'next/server';

export interface FieldError { path: string; code: string; message: string }

export interface ParseFail {
  ok: false;
  response: NextResponse;
}
export interface ParseOk<T> {
  ok: true;
  data: T;
}

export function parseOr400<T>(
  raw: unknown,
  schema: z.ZodSchema<T>,
  routeName: string,
): ParseOk<T> | ParseFail {
  const r = schema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  const fields: FieldError[] = r.error.issues.map((i) => ({
    path: i.path.join('.') || '(root)',
    code: i.code,
    message: i.message,
  }));
  // 한국어 4-원칙: 무엇이 / 왜 / 다음 / 정중.
  const userMessage =
    `요청 형식이 올바르지 않습니다 (${routeName}). ` +
    `잘못된 필드: ${fields.map((f) => f.path).join(', ')}. ` +
    `폼 입력값을 확인 후 다시 시도해주세요.`;
  return {
    ok: false,
    response: NextResponse.json(
      { error: 'invalid_input', userMessage, fields },
      { status: 400 },
    ),
  };
}
