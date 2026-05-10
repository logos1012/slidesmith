// render.service — Cycle 2 정식 파이프라인.
//
// Pipeline per request:
//   1. validate input shape (route owns Zod parse)
//   2. acquire browser via bulkhead + failure-boundary (`withBrowser`)
//   3. for each slide:
//        - wrapSlideHtml → page.setContent → wait fonts ready → screenshot
//        - Sharp post-process (format conversion + compression)
//   4. archive into a zip with metadata.json
//   5. release the page; the browser stays warm for the next request
//
// Memory / SLO budget:
//   - One Chromium instance shared across slides (SPEC §7).
//   - Pages are created and closed per slide so DOM/memory doesn't grow
//     monotonically on a 10-slide carousel.
//   - Sharp runs in-process on the screenshot Buffer — no temp files. The
//     whole zip is held in memory (10 × ~250 KB PNG ≈ 2.5 MB worst case).
//   - SPEC §11 Cycle 2: 3-10 slides ≤ 60s wall clock.

import archiver from "archiver";
import sharp from "sharp";
import { PassThrough } from "node:stream";
import type { Browser, Page } from "puppeteer-core";
import { inlineRemoteImages } from "../lib/image-fetch.js";
import { logger } from "../lib/logger.js";
import { buildPdf } from "../lib/pdf-builder.js";
import { resolveDimensions, wrapSlideHtml } from "../lib/slide-html.js";
import type {
  AspectRatio,
  RenderRequest,
  RenderFormat,
  SlideInput,
  SlideRenderResult,
  SlideSize,
} from "../types/render.types.js";
import { withBrowser } from "./browser-pool.js";

export interface RenderResult {
  jobId: string;
  zip: Buffer;
  slides: SlideRenderResult[];
  /** Cycle 3 — set when format is `pdf` or `both`. Multi-page single PDF. */
  pdf?: Buffer;
  durationMs: number;
}

/** Image format the per-slide screenshot pipeline produces. */
type ImageFormat = "png" | "jpg" | "webp";

/**
 * Cycle 3 — `pdf` and `both` are PDF-aware; per-slide image bytes are
 * captured as PNG (lossless source for both the zip entry and the PDF
 * embed). `both` ships PNGs + a single PDF. Pure-image formats stay as
 * before.
 */
function imageFormatFor(req: RenderFormat): ImageFormat {
  if (req === "pdf" || req === "both") return "png";
  return req;
}

const FORMAT_TO_MIME: Record<ImageFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

const FORMAT_TO_EXT: Record<ImageFormat, string> = {
  png: "png",
  jpg: "jpg",
  webp: "webp",
};

const SHARP_PIPELINES: Record<ImageFormat, (img: sharp.Sharp) => sharp.Sharp> =
  {
    png: (img) => img.png({ compressionLevel: 9, adaptiveFiltering: true }),
    jpg: (img) => img.jpeg({ quality: 90, mozjpeg: true }),
    webp: (img) => img.webp({ quality: 90 }),
  };

/**
 * Snap one slide. Owns its own Page so unrelated slides cannot leak DOM/memory
 * into each other. Caller must already hold the bulkhead (we are inside
 * `withBrowser`).
 */
async function renderSingleSlide(
  browser: Browser,
  slide: SlideInput,
  options: {
    aspectRatio: AspectRatio;
    /** Cycle 3 — image-only sub-format used for the screenshot pipeline. */
    imageFormat: ImageFormat;
    brandDSL?: RenderRequest["brandDSL"];
    watermark?: RenderRequest["watermark"];
    slideBg?: string;
    deviceScaleFactor: number;
    size?: SlideSize;
  },
): Promise<SlideRenderResult> {
  const { width, height } = resolveDimensions(options.aspectRatio, options.size);
  // Cycle 3 — pre-fetch + base64-inline any allowed remote images BEFORE
  // Puppeteer sees the HTML. Combined with `img-src 'self' data:` CSP, the
  // headless browser is forbidden from making outbound image requests on
  // its own — closes the SSRF re-entry that arbitrary `<img>` would re-open.
  const inlined = await inlineRemoteImages(slide.html);
  if (inlined.fetched > 0 || inlined.failed > 0) {
    logger.debug(
      {
        slideId: slide.id,
        imagesFetched: inlined.fetched,
        imagesFailed: inlined.failed,
        imageBytes: inlined.totalBytes,
      },
      "image_slot_inlined",
    );
  }
  // Cycle 2 Fix R4 — thread slideBg through to wrapSlideHtml so the watermark
  // luminance fallback is evaluated against the actual slide background, not
  // a hardcoded #ffffff (which produced wrong fallbacks on dark slides).
  const html = wrapSlideHtml({
    slideHtml: inlined.html,
    aspectRatio: options.aspectRatio,
    brandDSL: options.brandDSL,
    slideBg: options.slideBg,
    watermark: options.watermark,
    size: options.size,
  });

  const page: Page = await browser.newPage();
  try {
    // Cycle 2 Fix R1 — disable JS in the slide page. Cycle 2's wrap output is
    // pure CSS layout (no scripts needed for screenshot). Combined with the
    // CSP <meta> in wrapSlideHtml, this gives defense-in-depth against
    // untrusted HTML doing cross-origin XHR / SSRF / file:// reads.
    await page.setBypassCSP(false);
    await page.setJavaScriptEnabled(false);
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: options.deviceScaleFactor,
    });
    // Use 'domcontentloaded' (Puppeteer never blocks on subresources we don't
    // emit) plus an explicit `document.fonts.ready` wait for Korean font
    // metrics to settle. Avoids 'networkidle0' which would push us past SLO
    // when the slide HTML pulls in any third-party asset.
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    // Wait for Korean font metrics to settle. We pass a string so we don't
    // need DOM types in the host TS lib (the function body executes inside
    // the page context where `document` is real).
    await page.evaluate("document.fonts.ready");

    const raw = await page.screenshot({ type: "png", omitBackground: false });
    const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);

    const transformed = await SHARP_PIPELINES[options.imageFormat](
      sharp(buffer),
    ).toBuffer();

    return {
      id: slide.id,
      filename: `slide-${slide.id}.${FORMAT_TO_EXT[options.imageFormat]}`,
      mime: FORMAT_TO_MIME[options.imageFormat],
      bytes: transformed.length,
      buffer: transformed,
      width,
      height,
    };
  } finally {
    await page.close().catch((err) => {
      logger.warn({ err, slideId: slide.id }, "page_close_failed");
    });
  }
}

function buildZip(
  slides: SlideRenderResult[],
  jobId: string,
  pdfBuffer?: Buffer,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    archive.on("error", reject);
    archive.pipe(stream);

    for (const slide of slides) {
      archive.append(slide.buffer, { name: slide.filename });
    }
    if (pdfBuffer) {
      archive.append(pdfBuffer, { name: "slides.pdf" });
    }
    const metadata = {
      jobId,
      slideCount: slides.length,
      totalBytes: slides.reduce((sum, s) => sum + s.bytes, 0),
      generatedAt: new Date().toISOString(),
      slides: slides.map((s) => ({
        id: s.id,
        filename: s.filename,
        bytes: s.bytes,
        width: s.width,
        height: s.height,
      })),
      pdfBytes: pdfBuffer?.length,
    };
    archive.append(JSON.stringify(metadata, null, 2), {
      name: "metadata.json",
    });
    archive.finalize().catch(reject);
  });
}

/**
 * Cycle 2 정식 entry point. The route layer calls this and streams the
 * resulting Buffer back as `application/zip`.
 *
 * The whole carousel runs inside a SINGLE `withBrowser` call — that is the
 * unit the failure-boundary protects, and it keeps the bulkhead semaphore
 * held across slides so concurrent requests queue cleanly.
 */
export async function renderCarousel(
  req: RenderRequest,
  jobId: string,
): Promise<RenderResult> {
  const aspectRatio = req.aspectRatio ?? "1:1";
  const format = req.format ?? "png";
  const imageFormat = imageFormatFor(format);
  const deviceScaleFactor = req.deviceScaleFactor ?? 2;

  logger.info(
    {
      jobId,
      slideCount: req.slides.length,
      aspectRatio,
      format,
      imageFormat,
      hasSize: Boolean(req.size),
    },
    "render_start",
  );

  const startedAt = Date.now();
  const slides = await withBrowser(async (browser) => {
    const out: SlideRenderResult[] = [];
    for (const slide of req.slides) {
      const slideStart = Date.now();
      const r = await renderSingleSlide(browser, slide, {
        aspectRatio,
        imageFormat,
        brandDSL: req.brandDSL,
        watermark: req.watermark,
        slideBg: req.slideBg,
        deviceScaleFactor,
        size: req.size,
      });
      out.push(r);
      logger.debug(
        {
          jobId,
          slideId: slide.id,
          durationMs: Date.now() - slideStart,
          bytes: r.bytes,
        },
        "slide_rendered",
      );
    }
    return out;
  });

  // Cycle 3 — assemble PDF from per-slide image buffers when requested.
  // pdfkit accepts PNG/JPG only; we always shoot PNG when format is pdf|both
  // (see imageFormatFor) so embedding is lossless.
  let pdfBuffer: Buffer | undefined;
  if (format === "pdf" || format === "both") {
    pdfBuffer = await buildPdf(
      slides.map((s) => ({
        buffer: s.buffer,
        format: imageFormat === "jpg" ? "jpg" : "png",
        width: s.width,
        height: s.height,
      })),
    );
  }

  const zip = await buildZip(slides, jobId, pdfBuffer);
  const durationMs = Date.now() - startedAt;
  logger.info(
    {
      jobId,
      slideCount: slides.length,
      zipBytes: zip.length,
      pdfBytes: pdfBuffer?.length,
      durationMs,
    },
    "render_done",
  );

  return { jobId, zip, slides, pdf: pdfBuffer, durationMs };
}
