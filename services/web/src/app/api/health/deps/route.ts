// /api/health/deps — 9-light banner 입력 (SERVICE-web.md §5-2, DESIGN-v3 §3-12)
// Cycle 3 (A5): external 4 status를 storage `/health/deps`에서 aggregate.
//   storage가 anthropic/airtable/s3/gemini health 알림 (각 SDK가 ping).
//   saga state는 web 자체 — sagaState.countRecent(window)로 time-window health 추정.
// Cycle 3 Fix (F3+F4, 🟠-3): logger 박제 + saga light fixed-threshold → time-window.
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { getContainer } from '@/lib/container';
import { logger } from '@/lib/logger';
import type { DepStatus, ServiceStatus } from '@/types/foundation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DepsResponse {
  web: DepStatus; llm: DepStatus; render: DepStatus; storage: DepStatus;
  external: { anthropic: DepStatus; airtable: DepStatus; s3: DepStatus; gemini: DepStatus };
  saga: DepStatus;
}

const TTL_MS = 1000;
let cache: { at: number; value: DepsResponse } | null = null;
const unknown: DepStatus = { status: 'unknown', responseMs: 0 };

async function probe(url: string): Promise<DepStatus> {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(url + '/health', { signal: ctrl.signal });
    clearTimeout(timer);
    const responseMs = Date.now() - t0;
    if (res.ok) return { status: 'ok', responseMs };
    return { status: 'degraded', responseMs };
  } catch {
    return { status: 'down', responseMs: Date.now() - t0 };
  }
}

async function probeExternalFromStorage(url: string): Promise<DepsResponse['external']> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(url + '/health/deps', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('non-ok');
    const j = (await res.json()) as { external?: Partial<DepsResponse['external']> };
    const ext = j.external ?? {};
    return {
      anthropic: ext.anthropic ?? unknown, airtable: ext.airtable ?? unknown,
      s3: ext.s3 ?? unknown, gemini: ext.gemini ?? unknown,
    };
  } catch {
    return { anthropic: unknown, airtable: unknown, s3: unknown, gemini: unknown };
  }
}

/** Cycle 3 Fix (F4, 🟠-3): saga light time-window 평가.
 *  - 최근 SAGA_HEALTH_WINDOW_MS(기본 5분) 동안 failed/compensated saga 수 → degraded/down 판정
 *  - 동일 window 이전부터 멈춰있는 running/pending saga (멈춤 의심)는 always 'down' 신호
 *  - 30일 누적 row가 모두 터미널이어도 false-down 0 (이전 fixed-threshold의 회귀 차단).
 */
const SAGA_HEALTH_WINDOW_MS = 5 * 60 * 1000;
function probeSaga(nowMs = Date.now()): DepStatus {
  try {
    const { failedRecent, inflightStuck } = getContainer().sagaState.countRecent(SAGA_HEALTH_WINDOW_MS, nowMs);
    let status: ServiceStatus = 'ok';
    if (inflightStuck > 0 || failedRecent >= 3) status = 'down';
    else if (failedRecent >= 1) status = 'degraded';
    return { status, responseMs: 0 };
  } catch (err) {
    logger.warn({ err: String(err) }, 'health/deps: saga probe failed');
    return { status: 'unknown', responseMs: 0 };
  }
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) return NextResponse.json(cache.value);
  const [llm, render, storage, external] = await Promise.all([
    probe(env.LLM_SERVICE_URL),
    probe(env.RENDER_SERVICE_URL),
    probe(env.STORAGE_SERVICE_URL),
    probeExternalFromStorage(env.STORAGE_SERVICE_URL),
  ]);
  const value: DepsResponse = {
    web: { status: 'ok', responseMs: 0 },
    llm, render, storage, external, saga: probeSaga(),
  };
  cache = { at: Date.now(), value };
  if (llm.status === 'down' || render.status === 'down' || storage.status === 'down' || value.saga.status === 'down') {
    logger.warn(
      { llm: llm.status, render: render.status, storage: storage.status, saga: value.saga.status },
      'health/deps: degraded subsystems',
    );
  }
  return NextResponse.json(value);
}
