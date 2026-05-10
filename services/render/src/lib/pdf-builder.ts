// pdf-builder — Cycle 3.
//
// Take the per-slide PNG buffers we already produced and assemble a single
// multi-page PDF. We deliberately AVOID Puppeteer's `page.pdf()` because:
//   - Each slide is rendered as a fixed-resolution image (1080×W with brand
//     DSL, watermark, etc) — the screenshot is the source of truth.
//   - `page.pdf()` would re-render the slide through the print pipeline
//     where Chromium picks different font hinting + line-break heuristics,
//     drifting from the PNG output the user sees in /preview.
//   - Doing both adds a second navigation per slide → ~2× SLO regression.
//
// pdfkit (pure JS, MIT) is the canonical Node way to compose a multi-page
// PDF from raw image buffers. It supports PNG/JPEG embedding without
// transcoding, and lets us size each PDF page exactly to the slide pixels
// so the embed is 1:1 (no PDF rendering artefacts on the recipient's end).

import { PassThrough } from "node:stream";
import PDFDocument from "pdfkit";

export interface PdfPageInput {
  /** PNG or JPEG buffer for ONE slide. WebP is unsupported by pdfkit. */
  buffer: Buffer;
  /** Image format hint — drives pdfkit's embed path. */
  format: "png" | "jpg";
  /** Logical pixel size, used as the PDF page size 1pt = 1px. */
  width: number;
  height: number;
}

/**
 * Assemble a multi-page PDF from per-slide image buffers. Returns the full
 * PDF as a Buffer so the caller can stream it / archive it next to the
 * PNGs (format=both).
 *
 * Each PDF page is sized to the slide pixels so the embed is lossless.
 */
export function buildPdf(pages: PdfPageInput[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (pages.length === 0) {
      reject(new Error("buildPdf: no pages"));
      return;
    }
    // Initialize the PDF with the first page's dimensions; we'll add later
    // pages with explicit `addPage({ size: [w, h] })` so multi-aspect-ratio
    // carousels are supported (one slide 1:1, next 4:5, etc).
    const first = pages[0]!;
    const doc = new PDFDocument({
      size: [first.width, first.height],
      autoFirstPage: false,
      margin: 0,
      info: {
        Title: "Slidesmith carousel",
        Producer: "slidesmith-render",
        Creator: "slidesmith-render",
      },
    });
    const out = new PassThrough();
    const chunks: Buffer[] = [];
    out.on("data", (c: Buffer) => chunks.push(c));
    out.on("end", () => resolve(Buffer.concat(chunks)));
    out.on("error", reject);
    doc.on("error", reject);
    doc.pipe(out);

    for (const page of pages) {
      doc.addPage({ size: [page.width, page.height], margin: 0 });
      // pdfkit accepts Buffer for both `image()` and `format`-agnostic embed.
      // Position 0,0 + explicit width/height so the bitmap fills the page.
      doc.image(page.buffer, 0, 0, {
        width: page.width,
        height: page.height,
      });
    }
    doc.end();
  });
}
