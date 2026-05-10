// /api/render BFF가 render 서비스 통해 실제 PNG URL 반환 (PRD §16 - 시나리오 3).
//   Cycle 3 — 4 서비스 docker compose 통합 후 작동.
// Cycle 3 Fix (F2, 🟠-2): /api/health/deps snapshot으로 happy-path 분기 결정.
//   render internal `ok` → 200 strict expected. otherwise → 502 strict expected.
//   회귀 검출력: 200→502 / 502→500 등 모두 잡힘.
import { test, expect } from '@playwright/test';
import { snapshotDeps, isRenderHappyPath } from './_helpers';

test.describe('Render preview', () => {
  test('POST /api/render returns 200 (happy path) or 502 (render down) — strict', async ({ request }) => {
    const deps = await snapshotDeps(request);
    const res = await request.post('/api/render', {
      data: {
        templateId: 'minimal',
        ratio: '1:1',
        slides: [
          { index: 0, title: '훅: 첫 문장', body: '관심을 끄는 도입' },
          { index: 1, title: '본론', body: '핵심 메시지' },
        ],
      },
    });
    if (isRenderHappyPath(deps)) {
      expect(res.status(), `render=${deps.render} → expected 200`).toBe(200);
      const j = await res.json();
      expect(Array.isArray(j.pngUrls)).toBe(true);
      expect(j.pngUrls.length).toBeGreaterThan(0);
    } else {
      expect(res.status(), `render=${deps.render} → expected 502`).toBe(502);
      const j = await res.json();
      expect(j.error).toBeTruthy();
    }
  });

  test('POST /api/render 400 on invalid ratio (Korean userMessage)', async ({ request }) => {
    const res = await request.post('/api/render', {
      data: { templateId: 't', ratio: 'BAD', slides: [{ index: 0, title: 't', body: 'b' }] },
    });
    expect(res.status()).toBe(400);
    const j = await res.json();
    expect(j.userMessage).toMatch(/요청 형식이 올바르지 않습니다/);
  });
});
