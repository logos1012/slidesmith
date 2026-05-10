// /api/knowledge — BFF → storage `/knowledge`
import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get('category') ?? undefined;
  const q = sp.get('q') ?? undefined;
  try {
    const items = await getContainer().knowledge.list({
      ...(category ? { category } : {}),
      ...(q ? { q } : {}),
    });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: String(err), items: [] }, { status: 502 });
  }
}
