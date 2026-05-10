// preview.service — Cycle 2 정식. Single slide → PNG with a 5-min LRU cache.
//
// SPEC §5-3: GET /preview/:slideId returns image/png for the web Step-5
// preview pane. The same `withBrowser` bulkhead/breaker protects this path,
// so concurrent /preview hits never starve /render or vice versa.
//
// Cache key composition (`buildCacheKey`) deliberately includes every input
// that materially changes the rendered pixels — slideId alone is too coarse
// once Brand DSL or aspect ratio swaps. Stale entries auto-evict at TTL.

import { LRUCache } from "lru-cache";
import sharp from "sharp";
import { createHash } from "node:crypto";
import type { Page } from "puppeteer-core";
import { inlineRemoteImages } from "../lib/image-fetch.js";
import { logger } from "../lib/logger.js";
import { resolveDimensions, wrapSlideHtml } from "../lib/slide-html.js";
import type {
  AspectRatio,
  BrandDSLStub,
  PreviewResult,
  SlideSize,
} from "../types/render.types.js";
import { withBrowser } from "./browser-pool.js";

const PREVIEW_TTL_MS = 5 * 60 * 1000; // 5 min — SPEC §5-3
const PREVIEW_CACHE_MAX = 64; // ~64 entries × ~250 KB ≈ 16 MB cap

const cache = new LRUCache<string, PreviewResult>({
  max: PREVIEW_CACHE_MAX,
  ttl: PREVIEW_TTL_MS,
  // length-aware sizing keeps the in-memory footprint predictable.
  sizeCalculation: (value) => value.buffer.length,
  maxSize: 64 * 1024 * 1024, // 64 MB hard cap
});

// Cycle 2 Fix R7 — single-flight per cache key. Two concurrent /preview hits
// for the same key both find the cache empty → without dedup they each enqueue
// `withBrowser` and waste a full Chromium render. The map holds the in-flight
// Promise; followers await it instead of re-rendering. Cleared once the
// promise settles (the cache then has the result for the TTL window).
const inFlight = new Map<string, Promise<PreviewResult>>();

export interface PreviewRequest {
  slideId: string;
  html: string;
  aspectRatio: AspectRatio;
  brandDSL?: BrandDSLStub;
  /** Cycle 2 Fix R4 — see render.service. */
  slideBg?: string;
  /** Cycle 3 — explicit pixel size override; aspectRatio default otherwise. */
  size?: SlideSize;
}

export function buildCacheKey(req: PreviewRequest): string {
  const hash = createHash("sha1");
  hash.update(req.slideId);
  hash.update("|");
  hash.update(req.aspectRatio);
  hash.update("|");
  hash.update(req.html);
  hash.update("|");
  hash.update(JSON.stringify(req.brandDSL ?? {}));
  hash.update("|");
  hash.update(req.slideBg ?? "");
  hash.update("|");
  hash.update(req.size ? `${req.size.width}x${req.size.height}` : "");
  return hash.digest("hex");
}

export function clearPreviewCache(): void {
  cache.clear();
  inFlight.clear();
}

/** Test-only: introspect the single-flight map. */
export function getInFlightCount(): number {
  return inFlight.size;
}

export function getPreviewCacheStats(): { size: number; calculatedSize: number } {
  return {
    size: cache.size,
    calculatedSize: cache.calculatedSize ?? 0,
  };
}

async function doRender(req: PreviewRequest): Promise<PreviewResult> {
  const { width, height } = resolveDimensions(req.aspectRatio, req.size);
  // Cycle 3 — same image-slot inline pass as render.service. Cache key already
  // covers `html`, so re-rendering after an image swap correctly invalidates.
  const inlined = await inlineRemoteImages(req.html);
  const html = wrapSlideHtml({
    slideHtml: inlined.html,
    aspectRatio: req.aspectRatio,
    brandDSL: req.brandDSL,
    slideBg: req.slideBg,
    size: req.size,
  });
  const buffer = await withBrowser(async (browser) => {
    const page: Page = await browser.newPage();
    try {
      // Cycle 2 Fix R1 — kill JS + lock CSP (defense-in-depth vs SSRF/file://).
      await page.setBypassCSP(false);
      await page.setJavaScriptEnabled(false);
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      await page.evaluate("document.fonts.ready");
      const raw = await page.screenshot({ type: "png" });
      const screenshotBuffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      return sharp(screenshotBuffer)
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();
    } finally {
      await page.close().catch((err) => {
        logger.warn({ err, slideId: req.slideId }, "page_close_failed");
      });
    }
  });
  return {
    slideId: req.slideId,
    aspectRatio: req.aspectRatio,
    mime: "image/png",
    bytes: buffer.length,
    buffer,
  };
}

export async function renderPreview(
  req: PreviewRequest,
): Promise<PreviewResult & { fromCache: boolean }> {
  const key = buildCacheKey(req);
  const cached = cache.get(key);
  if (cached) {
    logger.debug({ slideId: req.slideId, key }, "preview_cache_hit");
    return { ...cached, fromCache: true };
  }

  // Cycle 2 Fix R7 — single-flight: if another render is already in progress
  // for this key, await its result instead of triggering a duplicate render.
  const existing = inFlight.get(key);
  if (existing) {
    logger.debug({ slideId: req.slideId, key }, "preview_in_flight_join");
    const result = await existing;
    return { ...result, fromCache: true };
  }

  const promise = doRender(req)
    .then((result) => {
      cache.set(key, result);
      logger.debug(
        { slideId: req.slideId, key, bytes: result.buffer.length },
        "preview_cached",
      );
      return result;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, promise);
  const result = await promise;
  return { ...result, fromCache: false };
}
