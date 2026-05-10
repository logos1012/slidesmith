// /api/templates — BFF → storage `/templates`
import { NextResponse } from 'next/server';
import { getContainer } from '@/lib/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await getContainer().templates.list();
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: String(err), items: [] }, { status: 502 });
  }
}
