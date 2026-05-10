// Aurora boundary 박제 (DESIGN-v3 §1-1-3 Aurora swap, §40 #51 D-aurora-1, PRD §16 - 시나리오 6).
//   --brand-color-* 토큰은 SlidePreviewBoundary 안에서만 set (Layer 1 격리).
//   도구 UI = Aurora vibrant gradient + glassy cards (--aurora-* + grad-* 토큰만).
//   사용자 carousel = brand DSL 그대로 (slide-preview-boundary 자손 안).
//
// Loop 3 Build (2026-05-10): 06-monochrome-boundary.spec.ts → 06-aurora-boundary.spec.ts rename.
// Selector [data-slide-preview]는 Loop 2 Build 사전 fix (slide-preview-boundary.tsx L26 attribute 박제).
import { test, expect } from '@playwright/test';

test.describe('Aurora boundary', () => {
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

  test('도구 UI에 Aurora 토큰 적용 (aurora-card / aurora-tag / bg-grad-*) — Aurora swap 박제', async ({
    page,
  }) => {
    await page.goto('/new');
    // /new 페이지가 Aurora 클래스를 사용하는지 박제. Loop 2 Build §6-2 보고:
    //   aurora-bar×1 / aurora-card×1 / aurora-tag×2 / bg-aurora-surface×11 /
    //   bg-grad-button×2 / bg-grad-hero×2 / text-ink-2×3 / text-ink-3×19
    const html = await page.content();
    // 핵심 Aurora 클래스 5종이 ≥1회 출현 (Aurora 표면 박제).
    expect(html).toMatch(/aurora-card/);
    expect(html).toMatch(/aurora-tag/);
    expect(html).toMatch(/aurora-bar/);
    expect(html).toMatch(/bg-grad-button|bg-grad-hero/);
    expect(html).toMatch(/text-ink-/);
  });
});
