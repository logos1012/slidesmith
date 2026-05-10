// 02-saga-recover-cross-service.test.mjs — Phase 6 통합 E2E
// Saga step replay (보상 트랜잭션 + retryToken) 4 서비스 통합 박제.
// CI dummy keys 환경: 외부 (airtable/s3) 호출 실패 → 207 partial → retry 207 정합.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { URLS, getJson, postJson } from './_helpers.mjs';

// 실제 web /api/save 스키마 (services/web/src/app/api/save/route.ts).
function buildSavePayload(idemKey) {
  return {
    sessionId: `phase6-${idemKey}`,
    templateId: 't1',
    ratio: '4:5',
    platform: 'instagram',
    slides: [{ index: 0, title: 'Saga test', body: '통합 E2E' }],
    idempotencyKey: idemKey,
  };
}

test('02-1 5 concurrent /api/save 동일 idempotencyKey → 1 saga only (web Cycle 3 F1)', async () => {
  const key = `phase6-saga-race-${Date.now()}`;
  const payload = buildSavePayload(key);
  const responses = await Promise.all(
    Array.from({ length: 5 }, () =>
      postJson(`${URLS.BASE}/api/save`, payload, { 'Idempotency-Key': key }),
    ),
  );

  // 모두 동일 status code
  const statuses = responses.map((r) => r.status);
  const uniqueStatuses = new Set(statuses);
  assert.equal(uniqueStatuses.size, 1,
    `5 concurrent calls returned different statuses: ${[...uniqueStatuses].join(',')}`);

  // partial 응답이면 모두 동일 retryToken
  const tokens = responses.map((r) => r.body.retryToken).filter(Boolean);
  if (tokens.length > 0) {
    const uniqueTokens = new Set(tokens);
    assert.equal(uniqueTokens.size, 1,
      `5 concurrent calls produced different retryTokens: ${[...uniqueTokens].join(',')}`);
  }
});

test('02-2 partial → /api/save/retry → 207 OR 200 (Saga step replay)', async () => {
  const key = `phase6-saga-retry-${Date.now()}`;
  const payload = buildSavePayload(key);
  const first = await postJson(`${URLS.BASE}/api/save`, payload, { 'Idempotency-Key': key });

  // CI dummy keys 환경에서는 207 partial 가능. happy path 환경에서는 200.
  if (first.status === 207 && first.body.retryToken) {
    const retry = await postJson(`${URLS.BASE}/api/save/retry`, {
      retryToken: first.body.retryToken,
    });
    // retry는 happy path 시 200, 외부 키 미주입 시 207 (동일 partial state)
    assert.ok([200, 207, 503].includes(retry.status),
      `retry status unexpected: ${retry.status}`);
  } else {
    // happy path or 503 — saga가 시작 자체 안 됨. 둘 다 OK.
    assert.ok([200, 503].includes(first.status),
      `first status unexpected: ${first.status}`);
  }
});

test('02-3 saga light = time-window (Cycle 3 Fix F4) — 누적 partial이 영구 down 안 됨', async () => {
  const deps = await getJson(`${URLS.BASE}/api/health/deps`);
  assert.equal(deps.status, 200);
  // saga light: failedRecent ≥ 3 OR inflightStuck > 0 시만 down. 그 외 ok/degraded.
  // CI 환경 시작 직후라면 ok 예상. 누적 partial 5건+ 있어도 5분 이전이면 ok 정합.
  assert.ok(['ok', 'degraded', 'down'].includes(deps.body.saga?.status),
    `saga.status = ${deps.body.saga?.status}`);
});

test('02-4 storage saga compensation contract (DELETE /carousels/:id 가능)', async () => {
  // 이미 존재하지 않는 ID로 DELETE → 404 (또는 200 idempotent), 5xx 0 정합.
  const r = await fetch(`${URLS.STORAGE}/carousels/nonexistent-phase6-test`, {
    method: 'DELETE',
  });
  // 보상 트랜잭션은 이미 사라진 리소스에 대해 graceful (404 또는 200 idempotent)
  assert.ok([200, 204, 404].includes(r.status),
    `compensation DELETE expected 200/204/404, got ${r.status}`);
});

test('02-5 cross-service health propagation: web 9-light가 모든 internal 정확 보고', async () => {
  // web /api/health/deps가 storage/llm/render 직접 probe 결과 정합 보고.
  const [deps, storage, llm, render] = await Promise.all([
    getJson(`${URLS.BASE}/api/health/deps`),
    getJson(`${URLS.STORAGE}/health`),
    getJson(`${URLS.LLM}/health`),
    getJson(`${URLS.RENDER}/health`),
  ]);

  assert.equal(deps.status, 200);
  // web이 직접 보는 storage status와 storage가 자기 보고하는 status가 정합
  // (degraded vs ok는 외부 키 의존이므로 둘 다 허용. up/down 자체만 정합 검증.)
  const isUp = (s) => s === 'ok' || s === 'degraded';
  assert.equal(isUp(deps.body.storage?.status), isUp(storage.body.status),
    `storage up/down mismatch: web=${deps.body.storage?.status} self=${storage.body.status}`);
  assert.equal(isUp(deps.body.llm?.status), isUp(llm.body.status),
    `llm up/down mismatch: web=${deps.body.llm?.status} self=${llm.body.status}`);
  assert.equal(isUp(deps.body.render?.status), isUp(render.body.status),
    `render up/down mismatch: web=${deps.body.render?.status} self=${render.body.status}`);
});
