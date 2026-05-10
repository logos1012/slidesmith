// GET /preview/:slideId — Cycle 2 정식 (SPEC §5-3).
//
// Returns image/png. Backed by an in-process LRU cache (5-min TTL, 64-entry
// cap, 64 MB total) so the web "Step 5 미리보기" panel can hammer the same
// slide without re-rendering. Brand DSL + html are sent as query params (or
// POST body, see below) so identical previews collapse onto one cache entry.
//
// Cycle 2 wire:
//   - GET  /preview/:slideId?aspectRatio=4:5 → 200 image/png
//     The slide HTML itself is required for a real render; until web Cycle 2
//     wires the slide store, accept it as the request body via POST as a
//     pragmatic /preview shape. Both verbs share the same cache key + handler.
//   - POST /preview/:slideId  body: { html, aspectRatio?, brandDSL? }
//     → 200 image/png (cached 5 min by composite key incl. html + brandDSL)

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { logger } from "../lib/logger.js";
import { renderPreview } from "../services/preview.service.js";

// Cycle 2 Fix R5 — same per-slide html cap as /render so /preview can't be
// abused to ship 8MB single-slide payloads either.
const MAX_PREVIEW_HTML_BYTES = 512_000;
// Cycle 2 Fix R3-aligned safe-id: lock the path param so /preview/:slideId
// never reflects untrusted bytes into the X-Preview-Slide-Id response header.
const SAFE_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

const ParamsSchema = z.object({
  slideId: z.string().regex(SAFE_ID_REGEX),
});

const PreviewBodySchema = z.object({
  html: z.string().min(1).max(MAX_PREVIEW_HTML_BYTES),
  aspectRatio: z.enum(["1:1", "4:5", "9:16"]).optional(),
  brandDSL: z
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
  // Cycle 2 Fix R4 — slide background for §12-3 watermark contrast check.
  slideBg: z.string().max(64).optional(),
  // Cycle 3 — same explicit size override as /render. Bounded so a stale
  // browser tab can't silently DoS the renderer with a 16k×16k preview.
  size: z
    .object({
      width: z.number().int().min(256).max(4096),
      height: z.number().int().min(256).max(4096),
    })
    .optional(),
});

export const previewRouter: Router = Router();

previewRouter.post("/preview/:slideId", async (req: Request, res: Response) => {
  const params = ParamsSchema.safeParse(req.params);
  const body = PreviewBodySchema.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({
      error: "BadRequest",
      issues: !params.success
        ? params.error.flatten()
        : !body.success
          ? body.error.flatten()
          : undefined,
    });
  }
  try {
    const result = await renderPreview({
      slideId: params.data.slideId,
      html: body.data.html,
      aspectRatio: body.data.aspectRatio ?? "4:5",
      brandDSL: body.data.brandDSL,
      slideBg: body.data.slideBg,
      size: body.data.size,
    });
    res.setHeader("Content-Type", result.mime);
    res.setHeader(
      "Cache-Control",
      "private, max-age=300", // align with the in-process LRU TTL
    );
    res.setHeader("Content-Length", String(result.bytes));
    res.setHeader("X-Preview-Cache", result.fromCache ? "HIT" : "MISS");
    res.setHeader("X-Preview-Slide-Id", result.slideId);
    return res.status(200).send(result.buffer);
  } catch (err) {
    logger.error({ err, slideId: params.data.slideId }, "preview_failed");
    return res.status(500).json({
      error: "PreviewFailed",
      message: err instanceof Error ? err.message : "unknown preview error",
    });
  }
});

// Convenience GET — returns 400 with a helpful message when html is missing
// (web's PoC clients will hit this before they wire POST).
previewRouter.get("/preview/:slideId", (req: Request, res: Response) => {
  const params = ParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: "BadRequest" });
  }
  return res.status(400).json({
    error: "BadRequest",
    message:
      "Use POST /preview/:slideId with { html, aspectRatio?, brandDSL? } body. " +
      "GET only works once the slide store wiring lands in Cycle 3.",
    slideId: params.data.slideId,
  });
});
