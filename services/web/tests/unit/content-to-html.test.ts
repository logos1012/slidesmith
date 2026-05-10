// content-to-html.test.ts — v1.0.1 fix.
// Verifies the BFF-side ContentSlide → HTML transform escapes XSS vectors so
// the render service receives sanitized markup before Puppeteer touches it.
import { describe, it, expect } from 'vitest';
import { contentSlideToHtml } from '@/lib/content-to-html';

describe('contentSlideToHtml', () => {
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

  it('isDark switches to white-on-black palette', () => {
    const light = contentSlideToHtml({ index: 0, title: 't', body: 'b' }, false);
    const dark = contentSlideToHtml({ index: 0, title: 't', body: 'b' }, true);
    expect(light).toContain('background:#ffffff');
    expect(light).toContain('color:#000000');
    expect(dark).toContain('background:#000000');
    expect(dark).toContain('color:#ffffff');
  });
});
