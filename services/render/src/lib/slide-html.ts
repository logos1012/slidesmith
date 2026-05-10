// wrapSlideHtml — Cycle 2 정식. open-carrusel 패턴.
//
// Cycle 2 scope (DESIGN-v3 정합):
//   - Brand DSL CSS variables 안전 주입 (`--brand-color-*`, `--brand-font-*`)
//     into a CSS namespace (`.slide-preview-container`) so brand color cannot
//     leak into the surrounding chrome (DESIGN-v3 §1-1-2).
//   - Watermark Luminance Auto-Fallback (DESIGN-v3 §12-3): if brand "lightest"
//     L > 80 OR contrast vs slide background < 3, swap to #999.
//   - Slide preview frame thickness adaptive (DESIGN-v3 §8-1): strong-color
//     detection (HSL L < 30 OR S > 80) → 2px frame, otherwise 1px.
//   - Pretendard self-hosted (Dockerfile installs the variable woff2 into
//     /usr/share/fonts/truetype/pretendard/), Noto Serif KR Editorial as a
//     web-safe stack fallback (no remote @font-face on the render hot path).
//
// Pretendard / Noto are loaded by the OS font-config; we only declare them in
// the CSS family list. No external network IO during page.setContent → keeps
// SLO budget tight (Puppeteer never blocks on font preflight).

import {
  detectStrongColor,
  getFrameThickness,
  getWatermarkColor,
} from "./color.js";
import type {
  AspectRatio,
  BrandDSLStub,
  SlideSize,
} from "../types/render.types.js";

export const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> =
  {
    "1:1": { width: 1080, height: 1080 },
    "4:5": { width: 1080, height: 1350 },
    "9:16": { width: 1080, height: 1920 },
  };

/**
 * Cycle 3 — resolve the final slide dimensions. Explicit `size` wins over
 * the enum so callers can ship 1200×1800 (Pinterest) or 1920×1080 (YouTube
 * thumb) without a SPEC change. The enum remains the recommended path —
 * it's what DESIGN-v3 §3 documents and what the LLM templates assume.
 */
export function resolveDimensions(
  aspectRatio: AspectRatio,
  size?: SlideSize,
): { width: number; height: number } {
  if (size) return { width: size.width, height: size.height };
  return DIMENSIONS[aspectRatio];
}

export interface WatermarkOptions {
  /** When false, no watermark element is emitted. */
  enabled?: boolean;
  /** "made with slidesmith" by default — OSS WoM loop. */
  text?: string;
  /** "bottom-right" by default. */
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  /** 0..1. Default 0.6. */
  opacity?: number;
}

export interface WrapOptions {
  slideHtml: string;
  aspectRatio: AspectRatio;
  brandDSL?: BrandDSLStub;
  /** Background color of the slide (used for watermark contrast check). */
  slideBg?: string;
  watermark?: WatermarkOptions;
  /**
   * Cycle 3 — explicit size override (1080×1080 / 1080×1350 / 1080×1920 /
   * arbitrary). When omitted falls back to DIMENSIONS[aspectRatio].
   */
  size?: SlideSize;
}

// Loop 2 Aurora swap (D-aurora-1, 2026-05-10):
//   - default primary/accent → Aurora deep ink (#170d2e) + violet (#7c5cff).
//   - 사용자 brand DSL이 들어오면 그대로 (Layer 1 boundary 그대로 — 사용자 색이 우선).
const DEFAULT_PRIMARY = "#170d2e";
const DEFAULT_ACCENT = "#7c5cff";
// Cycle 3 — DESIGN-v3 §2-1 token mapping inside the slide page:
//   - heading default = Editorial serif (Noto Serif KR Bold) → "신문 1면" 미학
//   - body default = Pretendard Variable (sans) → 한국어 가독성 + dyslexia 대응
// Pretendard + Noto Serif KR are OS-installed by the Dockerfile (orioncactus
// woff2 + fonts-noto-cjk), so the slide page never blocks on a remote font
// preflight inside the SLO budget.
const DEFAULT_HEADING_STACK =
  "'Noto Serif KR', 'Apple SD Gothic Neo', 'Malgun Gothic', serif";
const DEFAULT_BODY_STACK =
  "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, -apple-system, sans-serif";
const DEFAULT_SLIDE_BG = "#ffffff";

const POSITION_CSS: Record<NonNullable<WatermarkOptions["position"]>, string> = {
  "bottom-right": "right: 24px; bottom: 24px;",
  "bottom-left": "left: 24px; bottom: 24px;",
  "bottom-center":
    "left: 50%; bottom: 24px; transform: translateX(-50%);",
};

/** Escape ANY user/Brand-DSL-supplied string before pasting into HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Brand DSL values are pasted into a `<style>` block. Defense in depth:
 *   1. Color values must be hex / rgb / named — strip anything containing
 *      `<`, `>`, `;`, `}`, or `url(` to block CSS escape into another rule.
 *   2. Font family strings are wrapped through `escapeFontStack` which
 *      preserves quotes/commas but kills braces/semicolons.
 *
 * If the value is malformed, fall back to the safe default rather than
 * embedding it raw — Brand DSL must NEVER be load-bearing for safety.
 */
function sanitizeColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (/[<>;}{]/.test(trimmed) || /url\s*\(/i.test(trimmed)) return fallback;
  if (trimmed.length > 64) return fallback;
  return trimmed;
}

function escapeFontStack(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (/[<>;}{]/.test(trimmed) || /url\s*\(/i.test(trimmed)) return fallback;
  if (trimmed.length > 256) return fallback;
  return trimmed;
}

function buildWatermarkBlock(
  watermark: WatermarkOptions,
  brandColor: string,
  slideBg: string,
): string {
  if (watermark.enabled === false) return "";
  const text = watermark.text ?? "made with slidesmith";
  const position = watermark.position ?? "bottom-right";
  const opacity = Math.max(0, Math.min(1, watermark.opacity ?? 0.6));
  const color = getWatermarkColor({ brandColor, slideBg });
  const style =
    `position: absolute; ${POSITION_CSS[position]} ` +
    `font: 12px/1.4 'Pretendard Variable', sans-serif; ` +
    `color: ${color}; opacity: ${opacity}; ` +
    `letter-spacing: 0.01em; pointer-events: none; user-select: none;`;
  return `<div data-testid="watermark" data-watermark-color="${escapeHtml(color)}" style="${style}">${escapeHtml(text)}</div>`;
}

/**
 * Cycle 2 정식 wrapper.
 *
 *   - Wraps user slide HTML inside `.slide-preview-container` so all
 *     `--brand-color-*` CSS variables are scoped (Color Guard §1-1-2).
 *   - Frame thickness driven by detectStrongColor (DESIGN-v3 §8-1).
 *   - Optional watermark injected as the last child with luminance fallback.
 */
export function wrapSlideHtml({
  slideHtml,
  aspectRatio,
  brandDSL,
  slideBg = DEFAULT_SLIDE_BG,
  watermark = {},
  size,
}: WrapOptions): string {
  const { width, height } = resolveDimensions(aspectRatio, size);
  const primary = sanitizeColor(brandDSL?.colors?.primary, DEFAULT_PRIMARY);
  const accent = sanitizeColor(brandDSL?.colors?.accent, DEFAULT_ACCENT);
  const heading = escapeFontStack(
    brandDSL?.fonts?.heading,
    DEFAULT_HEADING_STACK,
  );
  const body = escapeFontStack(brandDSL?.fonts?.body, DEFAULT_BODY_STACK);
  const safeBg = sanitizeColor(slideBg, DEFAULT_SLIDE_BG);

  const frameThickness = getFrameThickness(primary);
  const isStrong = detectStrongColor(primary);
  const watermarkBlock = buildWatermarkBlock(watermark, primary, safeBg);

  // Cycle 2 Fix R1 — strict CSP. script-src 'none' kills any in-HTML <script>;
  // connect-src 'none' blocks fetch/XHR (cross-origin + SSRF + file://). Only
  // inline styles + data: images / fonts allowed because the wrap injects an
  // inline <style>. Defense in depth on top of setJavaScriptEnabled(false).
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; font-src 'self' data:; script-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'">
  <meta name="viewport" content="width=${width}, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: ${safeBg};
      -webkit-font-smoothing: antialiased;
    }
    /* Brand DSL is scoped to .slide-preview-container — Color Guard §1-1-2. */
    .slide-preview-container {
      --brand-color-primary: ${primary};
      --brand-color-accent: ${accent};
      --brand-font-heading: ${heading};
      --brand-font-body: ${body};
      width: ${width}px;
      height: ${height}px;
      position: relative;
      overflow: hidden;
      background: ${safeBg};
      color: var(--brand-color-primary);
      font-family: var(--brand-font-body);
      border: ${frameThickness}px solid var(--brand-color-primary);
    }
    .slide-preview-container h1,
    .slide-preview-container h2,
    .slide-preview-container h3,
    .slide-preview-container h4 {
      font-family: var(--brand-font-heading);
      color: var(--brand-color-primary);
    }
  </style>
</head>
<body>
  <div class="slide-preview-container" data-strong-color="${isStrong}" data-frame-thickness="${frameThickness}">
    ${slideHtml}
    ${watermarkBlock}
  </div>
</body>
</html>`;
}
