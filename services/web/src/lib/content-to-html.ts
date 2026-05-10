// lib/content-to-html.ts — Aurora swap (Loop 2 Build 2026-05-10).
// ContentSlide({index,title,body}) → safe HTML string for render service /render input.
// 외장: carousel design/aurora-2.jsx AuroraEditor 360x450 main slide 패턴 흡수.
//   light: cream gradient + violet accent + Pretendard
//   dark : violet→pink gradient + white text + Pretendard
// XSS escape 유지 (DESIGN-v3 §1-1-2 sanitize 그대로).
// Layer 1 격리: 사용자 brand DSL은 /render service slide-html.ts 안에서만 적용,
//                본 BFF wrapper는 도구 톤 (Aurora) 만 박제.

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

const FONT_STACK =
  "'Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif";

const MONO_STACK =
  "'JetBrains Mono','IBM Plex Mono',ui-monospace,SF Mono,Menlo,monospace";

export function contentSlideToHtml(slide: ContentSlideLike, isDark = false): string {
  const title = escape(slide.title);
  const body = escape(slide.body);
  const idx = String(slide.index + 1).padStart(2, '0');

  // Aurora dark: violet→pink gradient, white ink.
  // Aurora light: cream gradient, deep violet ink + violet accent strip.
  const bg = isDark
    ? 'linear-gradient(160deg,#7c5cff 0%,#c25dff 60%,#ff6b9d 100%)'
    : 'linear-gradient(135deg,#f1e6d0 0%,#e8c9b0 55%,#c9d4be 100%)';
  const fg = isDark ? '#ffffff' : '#170d2e';
  const sub = isDark ? 'rgba(255,255,255,.85)' : '#4a3d6b';
  const accent = isDark ? '#ffffff' : '#7c5cff';

  return (
    `<div style="padding:80px;background:${bg};color:${fg};` +
    `font-family:${FONT_STACK};letter-spacing:-0.01em;` +
    `height:100%;width:100%;display:flex;flex-direction:column;justify-content:center;` +
    `align-items:flex-start;text-align:left;box-sizing:border-box;position:relative">` +
    `<span style="position:absolute;top:48px;left:80px;font-family:${MONO_STACK};font-size:22px;color:${sub};opacity:.85">${idx} / 05</span>` +
    `<div style="height:6px;width:64px;background:${accent};border-radius:4px;margin-bottom:32px"></div>` +
    `<h1 style="font-size:72px;line-height:1.15;margin:0 0 32px 0;font-weight:800;letter-spacing:-0.02em;max-width:90%">${title}</h1>` +
    `<p style="font-size:32px;line-height:1.55;margin:0;max-width:85%;color:${sub};font-weight:500">${body}</p>` +
    `</div>`
  );
}
