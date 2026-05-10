// /api/elements — BFF → storage `/elements`
import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/container';
import type { ElementType } from '@/repositories/interfaces/IElementRepo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') as ElementType | null;
  const q = req.nextUrl.searchParams.get('q');
  try {
    const items = await getContainer().elements.list(type ?? undefined, q ?? undefined);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: String(err), items: [] }, { status: 502 });
  }
}
