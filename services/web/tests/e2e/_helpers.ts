// E2E helpers — Cycle 3 Fix (F2, 🟠-2): status code OR 강화.
//   docker compose 부팅 직후 /api/health/deps를 probe해서
//   "render up vs down" / "external up vs down" 정확히 한 분기로 expected status 결정.
//   외부 4 키 미설정 환경에서는 모든 happy-path가 502/503으로 fixed → strict toBe 가능.
import type { APIRequestContext } from '@playwright/test';

export type ServiceStatus = 'ok' | 'degraded' | 'down' | 'unknown';

export interface DepsSnapshot {
  llm: ServiceStatus;
  render: ServiceStatus;
  storage: ServiceStatus;
  external: { anthropic: ServiceStatus; airtable: ServiceStatus; s3: ServiceStatus; gemini: ServiceStatus };
  saga: ServiceStatus;
}

let cached: DepsSnapshot | null = null;

export async function snapshotDeps(request: APIRequestContext): Promise<DepsSnapshot> {
  if (cached) return cached;
  const res = await request.get('/api/health/deps');
  if (!res.ok()) {
    cached = {
      llm: 'unknown', render: 'unknown', storage: 'unknown',
      external: { anthropic: 'unknown', airtable: 'unknown', s3: 'unknown', gemini: 'unknown' },
      saga: 'unknown',
    };
    return cached;
  }
  const j = await res.json();
  cached = {
    llm: j.llm?.status ?? 'unknown',
    render: j.render?.status ?? 'unknown',
    storage: j.storage?.status ?? 'unknown',
    external: {
      anthropic: j.external?.anthropic?.status ?? 'unknown',
      airtable: j.external?.airtable?.status ?? 'unknown',
      s3: j.external?.s3?.status ?? 'unknown',
      gemini: j.external?.gemini?.status ?? 'unknown',
    },
    saga: j.saga?.status ?? 'unknown',
  };
  return cached;
}

/** render 서비스 happy path 가능 여부.
 *  render internal `ok` + s3 external `ok` (PNG 업로드용) 둘 다 필요.
 *  외부 S3 키 미설정 → s3 unknown → render upstream 502 expected.
 */
export function isRenderHappyPath(d: DepsSnapshot): boolean {
  return d.render === 'ok' && d.external.s3 === 'ok';
}

/** save Saga happy path 가능 여부 — render + storage + s3 + airtable 모두 ok이어야.
 *  외부 키 미설정 → airtable unknown → false → 207/503 expected.
 */
export function isSaveHappyPath(d: DepsSnapshot): boolean {
  return d.render === 'ok' && d.storage === 'ok'
    && d.external.s3 === 'ok' && d.external.airtable === 'ok';
}
