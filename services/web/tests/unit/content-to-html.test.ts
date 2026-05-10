// content-to-html.test.ts — Aurora swap (Loop 2 Build 2026-05-10).
// Verifies the BFF-side ContentSlide → HTML transform escapes XSS vectors so
// the render service receives sanitized markup before Puppeteer touches it.
// Aurora 토큰 정합 검증: light = cream gradient + violet accent + ink-deep text,
//                       dark  = violet→pink gradient + white text.
import { describe, it, expect } from 'vitest';
import { contentSlideToHtml } from '@/lib/content-to-html';

describe('contentSlideToHtml (Aurora)', () => {
  it('wraps title + body in styled flex layout', () => {
    const html = contentSlideToHtml({ index: 0, title: 'Hello', body: 'World' });
    expect(html).toContain('Hello');
    expect(html).toContain('World');
    expect(html).toContain('display:flex');
  });

  it('escapes &, <, >, ", \' in title and body', () => {
    const html = contentSlideToHtml({
      index: 0,
      title: '<script>alert(1)</script>',
      body: 'A & B "quoted" \'apos\'',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
    expect(html).toContain('&#39;');
  });

  it('isDark switches to Aurora violet→pink gradient with white text', () => {
    const light = contentSlideToHtml({ index: 0, title: 't', body: 'b' }, false);
    const dark = contentSlideToHtml({ index: 0, title: 't', body: 'b' }, true);
    // light: cream gradient (DESIGN-v3 §1-2 grad-hero) + ink-deep text + violet accent strip.
    expect(light).toContain('linear-gradient(135deg,#f1e6d0');
    expect(light).toContain('color:#170d2e');
    expect(light).toContain('background:#7c5cff');
    // dark: violet → pink gradient + white text.
    expect(dark).toContain('linear-gradient(160deg,#7c5cff');
    expect(dark).toContain('color:#ffffff');
  });

  it('renders 01/05 mono index marker + Pretendard font stack', () => {
    const html = contentSlideToHtml({ index: 0, title: 't', body: 'b' });
    expect(html).toContain('01 / 05');
    expect(html).toContain('Pretendard Variable');
  });
});
