// 통합 E2E 헬퍼 — Phase 6 Build
// node --test (Node ≥18 native runner) 사용. 외부 의존성 0.
// 모든 테스트는 docker compose up 후 4 서비스 healthy 가정.

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const LLM = process.env.LLM_BASE_URL ?? 'http://localhost:3001';
const RENDER = process.env.RENDER_BASE_URL ?? 'http://localhost:3002';
const STORAGE = process.env.STORAGE_BASE_URL ?? 'http://localhost:3003';

export const URLS = { BASE, LLM, RENDER, STORAGE };

/**
 * 간단한 fetch wrapper — JSON 응답 또는 에러 throw.
 * Phase 6 통합 E2E에서 외부 키 미주입 환경 (CI dummy keys)도 정합 작동.
 */
export async function getJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, ok: res.ok, body, headers: Object.fromEntries(res.headers) };
}

export async function postJson(url, payload, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, ok: res.ok, body };
}

/** /api/health/deps snapshot (web BFF 9-light aggregation). */
export async function depsSnapshot() {
  const r = await getJson(`${BASE}/api/health/deps`);
  if (!r.ok) throw new Error(`/api/health/deps failed: ${r.status}`);
  return r.body;
}

/** Korean userMessage 4-원칙 shape 검증 (Phase 6 contract C3). */
export function assertKoreanUxShape(userMessage, ctx = '') {
  if (!userMessage || typeof userMessage !== 'object') {
    throw new Error(`${ctx} userMessage missing or not object: ${JSON.stringify(userMessage)}`);
  }
  const keys = Object.keys(userMessage).sort().join(',');
  if (keys !== 'next,recovery,what,why') {
    throw new Error(`${ctx} userMessage shape != 4-원칙: ${keys}`);
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
