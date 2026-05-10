// Health deps 9-light banner (PRD §16 - 시나리오 7).
//   /api/health/deps가 4 서비스 + 4 external + 1 saga = 9 light 정확 표시.
import { test, expect } from '@playwright/test';

test.describe('Health deps 9-light', () => {
  test('GET /api/health/deps returns 9-light shape', async ({ request }) => {
    const res = await request.get('/api/health/deps');
    expect(res.status()).toBe(200);
    const j = await res.json();
    // 4 internal services
    for (const k of ['web', 'llm', 'render', 'storage']) {
      expect(j[k]).toMatchObject({ status: expect.any(String), responseMs: expect.any(Number) });
      expect(['ok', 'degraded', 'down', 'unknown']).toContain(j[k].status);
    }
    // 4 external (anthropic / airtable / s3 / gemini)
    for (const k of ['anthropic', 'airtable', 's3', 'gemini']) {
      expect(j.external[k]).toMatchObject({ status: expect.any(String), responseMs: expect.any(Number) });
    }
    // 1 saga (Cycle 3 A5 박제)
    expect(j.saga).toMatchObject({ status: expect.any(String), responseMs: expect.any(Number) });
  });

  test('Banner UI on /new shows 9 dots', async ({ page }) => {
    await page.goto('/new');
    const banner = page.getByRole('status', { name: /System dependencies/i });
    await expect(banner).toBeVisible({ timeout: 10_000 });
    // 9 dots — span > .h-2.w-2.rounded-full 스타일링.
    const dotCount = await banner.locator('span > span[aria-hidden]').count();
    // 각 light는 dot + label + icon 3 hidden span 중 dot이 첫 번째 (label sibling) — 정확 9 light.
    // Banner는 9 light × 3 spans (dot/label/icon) ~ 27. 9 light는 정확히 9 outer wrapper.
    const lightCount = await banner.locator('span.inline-flex').count();
    expect(lightCount).toBe(9);
    expect(dotCount).toBeGreaterThanOrEqual(9);
  });
});
