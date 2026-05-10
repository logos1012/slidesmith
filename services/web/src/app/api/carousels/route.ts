// /api/carousels — BFF → storage `/carousels`
import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const cursor = sp.get('cursor') ?? undefined;
  const limit = sp.get('limit') ? Number(sp.get('limit')) : 20;
  try {
    const result = await getContainer().carousels.list(cursor, limit);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err), items: [] }, { status: 502 });
  }
}
