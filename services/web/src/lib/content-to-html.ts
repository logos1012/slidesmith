// lib/content-to-html.ts — v1.0.1 contract gap fix
// ContentSlide({index,title,body}) → safe HTML string for render service /render input.
// Render service expects {id, html} per slide. BFF generates a minimal XSS-safe HTML
// wrapper here so callers don't have to ship template-specific HTML through the BFF.
// Cycle 3+ may swap this for a real template engine; today's job is end-to-end correctness.

const escape = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export interface ContentSlideLike {
  index: number;
  title: string;
  body: string;
}

export function contentSlideToHtml(slide: ContentSlideLike, isDark = false): string {
  const bg = isDark ? '#000000' : '#ffffff';
  const fg = isDark ? '#ffffff' : '#000000';
  const title = escape(slide.title);
  const body = escape(slide.body);
  return (
    `<div style="padding:80px;background:${bg};color:${fg};` +
    `font-family:'Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,sans-serif;` +
    `height:100%;width:100%;display:flex;flex-direction:column;justify-content:center;` +
    `align-items:center;text-align:center;box-sizing:border-box">` +
    `<h1 style="font-size:72px;line-height:1.2;margin:0 0 40px 0;font-weight:800">${title}</h1>` +
    `<p style="font-size:36px;line-height:1.6;margin:0;max-width:85%">${body}</p>` +
    `</div>`
  );
}
