// /api/render — BFF → render `/render`
// Cycle 2 Fix (F2, 🟠-2): Zod 입력 검증 박제. ratio enum / brand color / slide shape 모두 입구 거절.
import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/container';
import { RenderInputSchema } from '@/lib/schemas/render-input.schema';
import { parseOr400 } from '@/lib/schemas/parse-or-400';
import type { RenderInput } from '@/repositories/interfaces/IRenderGateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = parseOr400(raw, RenderInputSchema, '/api/render');
  if (!parsed.ok) return parsed.response;
  try {
    const result = await getContainer().render.render(parsed.data as unknown as RenderInput);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
