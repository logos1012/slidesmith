// /api/render/temp/[token]/[idx] — v1.0.1 contract gap fix
// Serves a single PNG from the in-process render-temp-store. Saga's upload-blob
// step fetches these URLs to push to S3. Token is opaque random UUID; no auth
// because (a) tokens are unguessable, (b) data is non-sensitive (just rendered
// slide PNGs that the user just produced), (c) TTL is 5 minutes.
import { NextRequest, NextResponse } from 'next/server';
import { getPng } from '@/lib/render-temp-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string; idx: string }> },
) {
  const { token, idx } = await params;
  const i = Number.parseInt(idx, 10);
  if (!Number.isFinite(i) || i < 0) {
    return new NextResponse('bad index', { status: 400 });
  }
  const png = getPng(token, i);
  if (!png) return new NextResponse('not found', { status: 404 });
  // Buffer is a Uint8Array subclass — NextResponse accepts it. Cast for TS strict.
  return new NextResponse(new Uint8Array(png), {
    headers: { 'content-type': 'image/png', 'cache-control': 'no-store' },
  });
}
