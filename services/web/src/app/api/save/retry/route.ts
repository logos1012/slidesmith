// /api/save/retry — Saga 재시도 (SERVICE-web.md §5-3)
import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { retryToken?: string } | null;
  if (!body?.retryToken) {
    return NextResponse.json({ error: 'retryToken required' }, { status: 400 });
  }
  const result = await getContainer().persist.retry(body.retryToken);
  if (result.status === 'success') return NextResponse.json(result, { status: 200 });
  if (result.status === 'partial') return NextResponse.json(result, { status: 207 });
  return NextResponse.json(result, { status: 503 });
}
