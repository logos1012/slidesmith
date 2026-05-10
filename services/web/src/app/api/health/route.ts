// /api/health — SERVICE-web.md §5-1
// Liveness probe (Docker HEALTHCHECK + 사용자 진단). 외부 의존성 0.
// Phase 6 Fix (F3): VERSION 하드코드 제거 → package.json import.
//   v1.0.0 release 명패와 런타임 endpoint 정합 박제 (Review §3-3 P0-3).
import { NextResponse } from 'next/server';
import pkg from '../../../../package.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VERSION = pkg.version;
const startedAt = Date.now();

export function GET() {
  return NextResponse.json({
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startedAt) / 1000),
  });
}
