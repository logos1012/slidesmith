// /api/save Saga 완주 (PRD §16 - 시나리오 4).
//   docker compose 4 서비스 부팅 후, real upstream 호출.
// Cycle 3 Fix (F2, 🟠-2): /api/health/deps snapshot 기반 strict status 분기.
//   external airtable `ok`이면 happy path → 200 strict expected.
//   render `ok` + airtable `unknown/down` → 207 strict (Saga가 save-airtable에서 실패).
//   render `down` → 207 strict (Saga가 render에서 실패).
//   모두 worse → 503 (orphan).
import { test, expect } from '@playwright/test';
import { snapshotDeps, isSaveHappyPath } from './_helpers';

test.describe('Publish Saga 완주', () => {
  test('POST /api/save — strict status by deps snapshot', async ({ request }) => {
    const deps = await snapshotDeps(request);
    const idempotencyKey = `e2e-${Date.now()}`;
    const res = await request.post('/api/save', {
      data: {
        sessionId: `e2e-session-${Date.now()}`,
        templateId: 'minimal',
        ratio: '1:1',
        platform: 'instagram',
        slides: [
          { index: 0, title: '훅', body: '한국어 인스타 카루셀 5분 발행 가이드' },
          { index: 1, title: '결론', body: '핵심 포인트 정리' },
        ],
        watermark: true,
        idempotencyKey,
      },
    });
    const j = await res.json();
    if (isSaveHappyPath(deps)) {
      expect(res.status(), `happy-path → 200`).toBe(200);
      expect(j.status).toBe('success');
      expect(j.carousel?.id).toBeTruthy();
      expect(Array.isArray(j.carousel.s3Urls)).toBe(true);
    } else {
      // 외부 키 미설정 → save Saga가 어딘가에서 partial 또는 orphan.
      expect(res.status(), `non-happy → 207 partial`).toBe(207);
      expect(j.status).toBe('partial');
      expect(j.retryToken).toBeTruthy();
    }
  });

  test('Idempotency: 같은 key 두 번 호출 → 동일 status + 동일 carousel/retryToken', async ({ request }) => {
    const deps = await snapshotDeps(request);
    const idempotencyKey = `e2e-idem-${Date.now()}`;
    const body = {
      sessionId: `e2e-session-${Date.now()}`, templateId: 'minimal', ratio: '1:1',
      platform: 'instagram',
      slides: [{ index: 0, title: '훅', body: '한국어 인스타 가이드' }], idempotencyKey,
    };
    const r1 = await request.post('/api/save', { data: body });
    const r2 = await request.post('/api/save', { data: body });
    // strict: 두 호출 동일 status code + 동일 status string.
    expect(r2.status()).toBe(r1.status());
    const j1 = await r1.json(); const j2 = await r2.json();
    expect(j1.status).toBe(j2.status);
    if (isSaveHappyPath(deps)) {
      expect(r1.status()).toBe(200);
      expect(j1.status).toBe('success');
      expect(j2.carousel?.id).toBe(j1.carousel?.id);
    } else {
      expect(r1.status()).toBe(207);
      expect(j1.status).toBe('partial');
      // F1 박제: 같은 key → 같은 retryToken 재사용.
      expect(j2.retryToken).toBe(j1.retryToken);
    }
  });
});
