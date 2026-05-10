// Monochrome boundary 박제 (DESIGN-v3 §1-1-3, PRD §16 - 시나리오 6).
//   --brand-color-* 토큰은 SlidePreviewBoundary 안에서만 set.
//   도구 UI는 oklch 단색 토큰만 사용.
import { test, expect } from '@playwright/test';

test.describe('Monochrome boundary', () => {
  test('도구 UI에 brand-color-* 변수 0건 (boundary 외부)', async ({ page }) => {
    await page.goto('/new');
    // 모든 inline style 수집해서 --brand-color- 사용 여부 검사 (slide preview 외부).
    const violations = await page.evaluate(() => {
      const elems = Array.from(document.querySelectorAll('*'));
      const offenders: string[] = [];
      for (const el of elems) {
        // SlidePreviewBoundary 내부면 skip (data-slide-preview 마커 사용).
        if (el.closest('[data-slide-preview]')) continue;
        const style = (el as HTMLElement).getAttribute('style') ?? '';
        if (/--brand-color-/.test(style)) offenders.push(el.tagName + ':' + style.slice(0, 80));
        // computed style 검사는 비싸서 inline만.
      }
      return offenders;
    });
    expect(violations).toEqual([]);
  });

  test('Landing tagline 한국어 (브랜딩 단일 진입점)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/한국어 인스타 카루셀/)).toBeVisible();
  });
});
