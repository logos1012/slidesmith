// /api/onboarding/seed — Pre-Day-1 seed (storage import 트리거)
import { NextResponse } from 'next/server';
import { getContainer } from '@/lib/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const c = getContainer();
    const [k, t] = await Promise.all([c.knowledge.list(), c.templates.list()]);
    return NextResponse.json({
      seeded: { knowledge: k.length, templates: t.length },
      next: '/new',
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
