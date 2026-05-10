// 5분 onboard 흐름 (PRD §16 - 시나리오 1).
//   Landing → /new → 위저드 5 step 라벨 모두 SSR 보임 → HealthDepsBanner 보임.
import { test, expect } from '@playwright/test';

test.describe('5분 onboard', () => {
  test('Landing → /new → 5 step 모두 보이고 HealthDepsBanner SSR 작동', async ({ page }) => {
    await page.goto('/');
    // tagline (한국어).
    await expect(page.getByText(/한국어 인스타 카루셀/)).toBeVisible();
    // CTA → /new.
    const cta = page.getByRole('link', { name: /시작|새 카루셀|만들기/ }).first();
    if (await cta.count()) {
      await cta.click();
    } else {
      await page.goto('/new');
    }
    await expect(page).toHaveURL(/\/new/);
    // 5 step 라벨 (주제/템플릿/본문/미리보기/발행) — wizard progress ol에서.
    const progress = page.getByRole('list', { name: /wizard progress/i });
    for (const label of ['주제', '템플릿', '본문', '미리보기', '발행']) {
      await expect(progress.getByText(label, { exact: true })).toBeVisible();
    }
    // HealthDepsBanner — role=status / "System dependencies" aria-label.
    await expect(page.getByRole('status', { name: /System dependencies/i })).toBeVisible({ timeout: 10_000 });
  });
});
