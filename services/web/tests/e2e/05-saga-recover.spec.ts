// Saga recover (PRD §16 - 시나리오 5).
//   docker compose stop slidesmith-web → start → recoverIncomplete가 작동.
//   E2E 안에서는 컨테이너 직접 제어 불가 — 대신 retry endpoint로 in-flight saga 재시도 검증.
// Cycle 3 Fix (F2, 🟠-2): retry status도 deps snapshot 기반 strict 분기.
import { test, expect } from '@playwright/test';
import { snapshotDeps, isSaveHappyPath } from './_helpers';

test.describe('Saga recover', () => {
  test('POST /api/save/retry with unknown token returns 503 orphan', async ({ request }) => {
    const res = await request.post('/api/save/retry', {
      data: { retryToken: 'unknown-token-not-existing' },
    });
    expect(res.status()).toBe(503);
    const j = await res.json();
    expect(j.status).toBe('orphan');
    expect(j.orphanQueueId).toBe('unknown-token-not-existing');
  });

  test('Save → if partial, retry with retryToken returns strict status by deps', async ({ request }) => {
    const deps = await snapshotDeps(request);
    const idempotencyKey = `e2e-retry-${Date.now()}`;
    const saveRes = await request.post('/api/save', {
      data: {
        sessionId: `s-${Date.now()}`, templateId: 'minimal', ratio: '1:1', platform: 'instagram',
        slides: [{ index: 0, title: '훅', body: '한국어 가이드' }], idempotencyKey,
      },
    });
    const saveJson = await saveRes.json();
    if (isSaveHappyPath(deps)) {
      // happy → save 자체가 200 success — retry 무관 검증.
      expect(saveRes.status()).toBe(200);
      expect(saveJson.status).toBe('success');
      return;
    }
    // 비-happy → partial expected, retry 시 동일 분기.
    expect(saveRes.status()).toBe(207);
    expect(saveJson.status).toBe('partial');
    expect(saveJson.retryToken).toBeTruthy();
    const retryRes = await request.post('/api/save/retry', {
      data: { retryToken: saveJson.retryToken },
    });
    // 외부가 그동안 복구 안 됨 → 동일 partial 207 strict expected.
    expect(retryRes.status()).toBe(207);
    const retryJson = await retryRes.json();
    expect(retryJson.status).toBe('partial');
  });
});
