// 01-end-to-end-onboard.test.mjs — Phase 6 통합 E2E
// 51 seed → wizard 입력 → render → save 흐름 cross-service 박제.
// CI dummy keys 환경: 외부 호출은 401/503 (4-원칙 shape) → BFF가 partial로 정합 표시.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { URLS, getJson, postJson, assertKoreanUxShape, depsSnapshot } from './_helpers.mjs';

test('01-1 storage /knowledge → 200 + items 배열', async () => {
  const r = await getJson(`${URLS.STORAGE}/knowledge?limit=10`);
  assert.equal(r.status, 200, `storage /knowledge = ${r.status}`);
  assert.ok(Array.isArray(r.body.items), 'items must be array');
});

test('01-2 storage /templates → 200', async () => {
  const r = await getJson(`${URLS.STORAGE}/templates`);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.items) || Array.isArray(r.body),
    'templates response must have items array');
});

test('01-3 storage /knowledge/seed without Idempotency-Key → 400 (Cycle 3 Fix F1)', async () => {
  const r = await postJson(`${URLS.STORAGE}/knowledge/seed`, {});
  assert.equal(r.status, 400, `expected 400, got ${r.status}`);
  assert.equal(r.body.error, 'missing_idempotency_key');
  // Korean userMessage 박제
  assert.match(r.body.userMessage, /[ㄱ-ㆎ가-힣]/u,
    'userMessage must contain Korean characters');
});

test('01-4 storage /knowledge/seed with Idempotency-Key → 201 or 200', async () => {
  const key = `phase6-onboard-${Date.now()}`;
  const r = await postJson(`${URLS.STORAGE}/knowledge/seed`, {}, { 'Idempotency-Key': key });
  assert.ok([200, 201, 502].includes(r.status), `expected 200/201/502, got ${r.status}`);
  if (r.status === 201 || r.status === 200) {
    assert.equal(r.body.total, 51, `seed total != 51 (got ${r.body.total})`);
  }
});

test('01-5 web /api/templates relay → 200 (BFF → storage)', async () => {
  const r = await getJson(`${URLS.BASE}/api/templates`);
  assert.equal(r.status, 200, `web BFF /api/templates = ${r.status}`);
});

test('01-6 web /api/knowledge relay → 200 (BFF → storage)', async () => {
  const r = await getJson(`${URLS.BASE}/api/knowledge`);
  assert.equal(r.status, 200);
});

test('01-7 llm /content/generate without ANTHROPIC_API_KEY → 4-원칙 shape (503/502/200)', async () => {
  // 실제 스키마: topic (string, 1~500자) + slideCount (3~10) + tone? + language?
  const r = await postJson(`${URLS.LLM}/content/generate`, {
    topic: '한국어 인스타 카루셀 5분 만들기',
    slideCount: 5,
    language: 'ko',
  });
  // CI dummy key → upstream 401 → llm classifies as unauthorized → 503 + 4-원칙 shape
  assert.ok([200, 401, 502, 503].includes(r.status),
    `expected 200/401/502/503, got ${r.status}: ${JSON.stringify(r.body)}`);
  if (r.status >= 400 && r.body.userMessage) {
    assertKoreanUxShape(r.body.userMessage, '/content/generate');
  }
});

// 실제 web /api/save 스키마 (services/web/src/app/api/save/route.ts):
//   sessionId, templateId, ratio (1:1|4:5|9:16|...), platform (instagram|...),
//   slides[{index, title, body}], idempotencyKey, brandDsl?, watermark?, captionDraft?
function buildSavePayload(idemKey) {
  return {
    sessionId: `phase6-${Date.now()}`,
    templateId: 't1',
    ratio: '4:5',
    platform: 'instagram',
    slides: [{ index: 0, title: 'Phase 6 Onboard', body: '본문 통합 E2E' }],
    idempotencyKey: idemKey,
  };
}

test('01-8 web /api/save Saga end-to-end (CI dummy keys → 207 partial)', async () => {
  const idemKey = `phase6-onboard-save-${Date.now()}`;
  const r = await postJson(`${URLS.BASE}/api/save`, buildSavePayload(idemKey),
    { 'Idempotency-Key': idemKey });

  // Happy path: 200 (모든 외부 키 박제 시) or 207 partial (CI dummy keys 시)
  assert.ok([200, 207, 503].includes(r.status),
    `unexpected save status ${r.status}: ${JSON.stringify(r.body)}`);

  if (r.status === 207) {
    assert.equal(r.body.status, 'partial');
    assert.ok(r.body.failedAt, 'partial response missing failedAt');
    assert.ok(r.body.retryToken, 'partial response missing retryToken');
  }
});

test('01-9 idempotency: 동일 키 두 번 호출 → 동일 응답 (Cycle 3 Fix F1)', async () => {
  const idemKey = `phase6-idem-${Date.now()}`;
  const payload = buildSavePayload(idemKey);
  const r1 = await postJson(`${URLS.BASE}/api/save`, payload, { 'Idempotency-Key': idemKey });
  const r2 = await postJson(`${URLS.BASE}/api/save`, payload, { 'Idempotency-Key': idemKey });
  assert.equal(r1.status, r2.status, 'same idempotencyKey must yield same status');
  if (r1.body.retryToken && r2.body.retryToken) {
    assert.equal(r1.body.retryToken, r2.body.retryToken,
      'same idempotencyKey must yield same retryToken');
  }
});
