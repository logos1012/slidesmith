// /api/render/temp/[token]/zip — v1.0.1 contract gap fix
// Serves the original ZIP from the render service for clients that prefer the
// archive over individual PNG fetches. Same TTL/auth model as the per-PNG route.
import { NextRequest, NextResponse } from 'next/server';
import { getZip } from '@/lib/render-temp-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const zip = getZip(token);
  if (!zip) return new NextResponse('not found', { status: 404 });
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      'content-type': 'application/zip',
      'cache-control': 'no-store',
      'content-disposition': `attachment; filename="slidesmith-${token}.zip"`,
    },
  });
}
