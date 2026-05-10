// POST /render — Cycle 2 정식. Validates body, runs the carousel pipeline
// (browser-pool → wrap → screenshot → Sharp → archive), and streams a
// `application/zip` response back to the caller.
//
// Request shape mirrors SPEC §5-2 with two Cycle-2-scoped tweaks:
//   - `format` is png | jpg | webp (PDF lands in Cycle 3 via the same route).
//   - `size` (width/height) is accepted for spec parity but currently locked
//     to the aspectRatio's dimensions; arbitrary sizes are a Cycle 3 feature.
import { Router, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { logger } from "../lib/logger.js";
import { renderCarousel } from "../services/render.service.js";

// Cycle 2 Fix R2 — slide.id is interpolated into the ZIP entry filename
// (`slide-${id}.png`). A naive `min(1).max(64)` accepts `..` and `/`, enabling
// zip-slip on permissive extractors. Restrict to `[A-Za-z0-9_-]{1,64}` so the
// producer never emits a path-traversal filename and downstream consumers
// can't be fooled.
const SAFE_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

// Cycle 2 Fix R5 — per-slide html size cap. With slides max 20 and 512KB each
// worst-case payload is ~10MB, comfortably below the 8MB body cap (which is
// also raised to 16MB below to allow the slack). Prevents DoS where one
// pathological slide eats the 1.5GB container memory.
const MAX_SLIDE_HTML_BYTES = 512_000;

const SlideInputSchema = z.object({
  id: z.string().regex(SAFE_ID_REGEX, "slide.id must match [A-Za-z0-9_-]{1,64}"),
  html: z.string().min(1).max(MAX_SLIDE_HTML_BYTES),
  brandDsl: z
    .object({
      fonts: z
        .object({
          heading: z.string().max(256).optional(),
          body: z.string().max(256).optional(),
        })
        .optional(),
      colors: z
        .object({
          primary: z.string().max(64).optional(),
          accent: z.string().max(64).optional(),
        })
        .optional(),
    })
    .optional(),
});

const BrandDSLSchema = z
  .object({
    fonts: z
      .object({
        heading: z.string().max(256).optional(),
        body: z.string().max(256).optional(),
      })
      .optional(),
    colors: z
      .object({
        primary: z.string().max(64).optional(),
        accent: z.string().max(64).optional(),
      })
      .optional(),
  })
  .optional();

const WatermarkSchema = z
  .object({
    enabled: z.boolean().optional(),
    text: z.string().max(256).optional(),
    position: z
      .enum(["bottom-right", "bottom-left", "bottom-center"])
      .optional(),
    opacity: z.number().min(0).max(1).optional(),
  })
  .optional();

// Cycle 3 — explicit slide size. Bounded to [256..4096] so a malicious caller
// can't drive Puppeteer's viewport into an OOM. The 4096 ceiling is twice
// 9:16's 1920 long edge — comfortably above the 4K-ish use cases we care
// about, and well below the Chromium hard limit.
const SizeSchema = z
  .object({
    width: z.number().int().min(256).max(4096),
    height: z.number().int().min(256).max(4096),
  })
  .optional();

const RenderRequestSchema = z.object({
  // SPEC §11 Cycle 2: 3-10 slides ≤60s SLO. We accept down to 1 (preview-like
  // single slide path is still /render with N=1).
  slides: z.array(SlideInputSchema).min(1).max(20),
  aspectRatio: z.enum(["1:1", "4:5", "9:16"]).optional(),
  // Cycle 3 — `pdf` (single multi-page PDF) and `both` (PNGs + PDF).
  format: z.enum(["png", "jpg", "webp", "pdf", "both"]).optional(),
  // Cycle 3 — reintroduced after Cycle 2 Fix R6 with real plumbing. Drives
  // both Puppeteer's viewport AND the inline `<style>` width/height so the
  // rendered DOM matches the screenshot pixels.
  size: SizeSchema,
  brandDSL: BrandDSLSchema,
  watermark: WatermarkSchema,
  // Cycle 2 Fix R4 — pass-through to wrapSlideHtml for §12-3 contrast check.
  slideBg: z.string().max(64).optional(),
  deviceScaleFactor: z.number().min(1).max(3).optional(),
  // Cycle 2 Fix R3 — correlationId is reflected verbatim into
  // `Content-Disposition: attachment; filename="slidesmith-${id}.zip"` and
  // the `X-Render-Job-Id` header. A value like `"; filename="poisoned.exe`
  // splits the header (browsers honor the last filename param). Lock to the
  // same safe-id regex as slide.id.
  correlationId: z.string().regex(SAFE_ID_REGEX).optional(),
});

export const renderRouter: Router = Router();

renderRouter.post("/render", async (req: Request, res: Response) => {
  const parsed = RenderRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "BadRequest",
      issues: parsed.error.flatten(),
    });
  }
  const jobId = parsed.data.correlationId ?? nanoid();
  try {
    const result = await renderCarousel(parsed.data, jobId);
    // Cycle 3 — `pdf` ships a raw application/pdf body (no zip envelope) so
    // the client can stream it directly to a viewer; `both` and the legacy
    // image formats stay as ZIP. Headers are reflected the same way for both.
    const isPdfOnly = parsed.data.format === "pdf";
    const body = isPdfOnly && result.pdf ? result.pdf : result.zip;
    const contentType = isPdfOnly ? "application/pdf" : "application/zip";
    const ext = isPdfOnly ? "pdf" : "zip";
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="slidesmith-${jobId}.${ext}"`,
    );
    res.setHeader("X-Render-Job-Id", jobId);
    res.setHeader("X-Render-Duration-Ms", String(result.durationMs));
    res.setHeader("X-Render-Slide-Count", String(result.slides.length));
    if (result.pdf) {
      res.setHeader("X-Render-Pdf-Bytes", String(result.pdf.length));
    }
    res.setHeader("Content-Length", String(body.length));
    return res.status(200).send(body);
  } catch (err) {
    logger.error({ err, jobId }, "render_failed");
    return res.status(500).json({
      error: "RenderFailed",
      jobId,
      message: err instanceof Error ? err.message : "unknown render error",
    });
  }
});
