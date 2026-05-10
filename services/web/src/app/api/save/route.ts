// /api/save — Saga 5-step (SERVICE-web.md §5-3)
// Cycle 2 Fix (F2, 🟠-1): Zod 입력 검증 박제. enum / 길이 / shape 모두 입구 거절.
import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/container';
import { PersistInputSchema } from '@/lib/schemas/persist-input.schema';
import { parseOr400 } from '@/lib/schemas/parse-or-400';
import type { PersistInput } from '@/repositories/interfaces/IPersistOrchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = parseOr400(raw, PersistInputSchema, '/api/save');
  if (!parsed.ok) return parsed.response;
  // Zod로 모두 검증된 후 brand type (UUID 등)으로 narrow.
  const result = await getContainer().persist.persist(parsed.data as unknown as PersistInput);
  if (result.status === 'success') return NextResponse.json(result, { status: 200 });
  if (result.status === 'partial') return NextResponse.json(result, { status: 207 });
  return NextResponse.json(result, { status: 503 });
}
