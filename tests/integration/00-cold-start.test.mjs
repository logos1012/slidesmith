// 00-cold-start.test.mjs — Phase 6 통합 E2E
// 4 서비스 (web/llm/render/storage) docker compose up 후 모두 healthy 박제.
// 가정: CI 또는 로컬에서 사전에 `docker compose up -d` 수행 + 4 서비스 healthy.
// 본 spec은 healthcheck 결과를 직접 curl로 재검증 + 9-light shape 박제.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { URLS, getJson, depsSnapshot } from './_helpers.mjs';

test('00-1 storage /health → 200', async () => {
  const r = await getJson(`${URLS.STORAGE}/health`);
  assert.equal(r.status, 200, `storage /health = ${r.status}: ${JSON.stringify(r.body)}`);
  assert.ok(['ok', 'degraded'].includes(r.body.status), `storage status = ${r.body.status}`);
});

test('00-2 llm /health → 200', async () => {
  const r = await getJson(`${URLS.LLM}/health`);
  assert.equal(r.status, 200, `llm /health = ${r.status}: ${JSON.stringify(r.body)}`);
  assert.ok(['ok', 'degraded'].includes(r.body.status), `llm status = ${r.body.status}`);
});

test('00-3 render /health → 200 + chromium available', async () => {
  const r = await getJson(`${URLS.RENDER}/health`);
  assert.equal(r.status, 200, `render /health = ${r.status}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.chromium?.available, true, 'chromium not available');
});

test('00-4 web /api/health → 200', async () => {
  const r = await getJson(`${URLS.BASE}/api/health`);
  assert.equal(r.status, 200, `web /api/health = ${r.status}: ${JSON.stringify(r.body)}`);
});

test('00-5 web /api/health/deps → 9-light shape', async () => {
  const deps = await depsSnapshot();
  // web/llm/render/storage 4 internal lights
  for (const k of ['llm', 'render', 'storage']) {
    assert.ok(deps[k], `missing ${k} light`);
    assert.ok(['ok', 'degraded', 'down'].includes(deps[k].status),
      `${k}.status = ${deps[k].status}`);
  }
  // 4 external lights (anthropic/airtable/s3/gemini)
  assert.ok(deps.external, 'missing external aggregator');
  for (const k of ['anthropic', 'airtable', 's3', 'gemini']) {
    assert.ok(deps.external[k], `missing external.${k}`);
    assert.ok(['ok', 'degraded', 'down', 'unknown'].includes(deps.external[k].status),
      `external.${k}.status = ${deps.external[k].status}`);
  }
  // saga light
  assert.ok(deps.saga, 'missing saga light');
});

test('00-6 4 internal services 모두 ok (degraded는 외부 키 미주입 시)', async () => {
  const deps = await depsSnapshot();
  // CI dummy keys 환경에서는 internal은 모두 ok (외부 key 미주입은 internal과 무관).
  for (const k of ['llm', 'render', 'storage']) {
    assert.equal(deps[k].status, 'ok',
      `${k}.status expected ok, got ${deps[k].status}`);
  }
});
