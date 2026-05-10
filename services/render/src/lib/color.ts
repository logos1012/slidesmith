// Color helpers — DESIGN-v3 §8 (slide preview frame adaptive) and §12-3
// (watermark luminance auto-fallback). Intentionally pure & dependency-free
// so wrapSlideHtml stays unit-testable without DOM/canvas.
//
// `luminance` and `lightness` are NOT the same: WCAG relative luminance is the
// physical brightness used for contrast ratios, while HSL `L` is the lightness
// channel of the perceptual HSL model. Both appear in DESIGN-v3.

export interface HslColor {
  h: number; // 0..360
  s: number; // 0..100
  l: number; // 0..100
}

export interface RgbColor {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
}

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Parse a CSS hex color (#abc, #aabbcc, with or without leading #) into RGB.
 * Returns null if the input is malformed — callers must handle that branch.
 */
export function parseHex(input: string): RgbColor | null {
  const match = HEX_RE.exec(input.trim());
  if (!match) return null;
  let hex = match[1] as string;
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
}

export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const lRaw = (max + min) / 2;
  const d = max - min;

  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * lRaw - 1));
    switch (max) {
      case rN:
        h = ((gN - bN) / d) % 6;
        break;
      case gN:
        h = (bN - rN) / d + 2;
        break;
      default:
        h = (rN - gN) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(lRaw * 100),
  };
}

/**
 * WCAG 2.x relative luminance, returned on a 0..100 scale to match the
 * thresholds quoted in DESIGN-v3 §12-3 ("L > 80 → fallback").
 */
export function getLuminance(rgb: RgbColor): number {
  const channel = (c: number): number => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum =
    0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  return Math.round(lum * 100);
}

export function getContrast(a: RgbColor, b: RgbColor): number {
  const la = getLuminance(a) / 100;
  const lb = getLuminance(b) / 100;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * DESIGN-v3 §8-1: detect "강 톤" brand color → 2px frame, otherwise 1px.
 * Definition: HSL lightness < 30 OR HSL saturation > 80.
 */
export function detectStrongColor(hex: string): boolean {
  const rgb = parseHex(hex);
  if (!rgb) return false;
  const { s, l } = rgbToHsl(rgb);
  return l < 30 || s > 80;
}

export function getFrameThickness(hex: string): 1 | 2 {
  return detectStrongColor(hex) ? 2 : 1;
}

/**
 * DESIGN-v3 §12-3: watermark color = brand "lightest". If lightest's WCAG
 * luminance > 80 OR contrast against the slide background < 3:1, fall back
 * to monochrome editorial gray (#999).
 *
 * Cycle 2 callers may not know the brand "lightest" yet (Brand DSL is still a
 * stub) — so they pass the raw brand color and we approximate "lightest" by
 * lightening the brand color toward white. Full Brand DSL palette resolution
 * lands in Cycle 3 alongside Storage's BrandVoice contract.
 */
export function lightenToward(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const t = Math.max(0, Math.min(1, amount));
  const r = Math.round(rgb.r + (255 - rgb.r) * t);
  const g = Math.round(rgb.g + (255 - rgb.g) * t);
  const b = Math.round(rgb.b + (255 - rgb.b) * t);
  return rgbToHex({ r, g, b });
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export interface WatermarkColorOptions {
  brandColor: string;
  slideBg: string;
  /** 0..1, how far to lighten brand toward white before evaluating. */
  lightenAmount?: number;
}

export function getWatermarkColor({
  brandColor,
  slideBg,
  lightenAmount = 0.7,
}: WatermarkColorOptions): string {
  const lightestHex = lightenToward(brandColor, lightenAmount);
  const lightestRgb = parseHex(lightestHex);
  const slideBgRgb = parseHex(slideBg);
  // Defensive: if we cannot parse, behave as if the contrast check failed and
  // fall back to monochrome — never throw inside a render hot-path.
  if (!lightestRgb || !slideBgRgb) return "#999999";
  const lum = getLuminance(lightestRgb);
  const contrast = getContrast(lightestRgb, slideBgRgb);
  if (lum > 80 || contrast < 3) return "#999999";
  return lightestHex;
}
