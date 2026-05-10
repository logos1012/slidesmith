// Shared render-domain types. Cycle 2 promotes the Cycle 1 stubs into
// concrete contracts that route + service share. Cycle 3 will publish them
// via openapi.yaml together with the full Brand DSL spec.

export type AspectRatio = "1:1" | "4:5" | "9:16";

/**
 * SPEC §5-2 + §11 Cycle 3 output formats. Cycle 3 adds `pdf` (multi-page
 * single-file PDF合본) and `both` (zip contains PNGs + the PDF). The PNG/JPG/
 * WebP formats remain pixel outputs.
 */
export type RenderFormat = "png" | "jpg" | "webp" | "pdf" | "both";

/**
 * Cycle 3 — explicit width/height. Reintroduced after Cycle 2 Fix R6 dropped
 * the silent-drift `size` field. Now actually plumbed through to Puppeteer
 * viewport AND wrapSlideHtml dimensions, so the same enum aspectRatio works
 * for the common case while exotic targets (e.g. 1080×1080 print, 1200×1800
 * Pinterest) bypass the enum without forcing a code change.
 */
export interface SlideSize {
  width: number;
  height: number;
}

export interface BrandDSLStub {
  fonts?: {
    heading?: string;
    body?: string;
  };
  colors?: {
    primary?: string;
    accent?: string;
  };
}

export interface SlideInput {
  id: string;
  html: string;
  /** Optional per-slide BrandDSL override — Cycle 3 surface, ignored today. */
  brandDsl?: BrandDSLStub;
}

export interface WatermarkRequest {
  enabled?: boolean;
  text?: string;
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  opacity?: number;
}

export interface RenderRequest {
  slides: SlideInput[];
  aspectRatio?: AspectRatio;
  format?: RenderFormat;
  brandDSL?: BrandDSLStub;
  watermark?: WatermarkRequest;
  /**
   * Cycle 2 Fix R4 — actual slide background color, used by the watermark
   * luminance fallback (DESIGN-v3 §12-3 contrast rule). Defaults to `#ffffff`
   * when omitted; pass the slide's real bg (e.g. `#1A1A1A` for dark mode) so
   * the fallback returns the lightened brand color instead of `#999`.
   */
  slideBg?: string;
  /** Default 2 (retina). 1 lowers memory + bytes for low-end web previews. */
  deviceScaleFactor?: number;
  /**
   * Cycle 3 — explicit width/height override. When omitted, dimensions
   * come from `aspectRatio`. Validated to {width,height} ∈ [256..4096];
   * the wrap layer ALSO uses these for the inline `<style>` width/height
   * declarations so the rendered slide DOM matches the screenshot viewport.
   */
  size?: SlideSize;
  correlationId?: string;
}

export interface SlideRenderResult {
  id: string;
  filename: string;
  mime: string;
  bytes: number;
  buffer: Buffer;
  /** Cycle 3 — pixel dimensions used for this slide (drives PDF page size). */
  width: number;
  height: number;
}

export interface PreviewResult {
  slideId: string;
  aspectRatio: AspectRatio;
  mime: string;
  bytes: number;
  buffer: Buffer;
}

export interface BrowserPoolStats {
  active: number;
  idle: number;
}

// ─── Cycle 1 stubs (still imported by render.service stub callers) ─────────
// Kept as type aliases so the rest of the codebase compiles unchanged after
// Cycle 2 widens the contract.
export type SlideInputStub = SlideInput;
export type RenderRequestStub = RenderRequest;
