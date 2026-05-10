// pdf-builder — Cycle 3.
// Verifies the multi-page PDF is shaped correctly without launching anything.
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { buildPdf } from "../src/lib/pdf-builder.js";

async function tinyPng(width: number, height: number): Promise<Buffer> {
  // Sharp builds a real PNG buffer that pdfkit can embed.
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

describe("buildPdf (Cycle 3)", () => {
  it("produces a non-empty PDF with the %PDF- magic header", async () => {
    const png = await tinyPng(100, 100);
    const buf = await buildPdf([
      { buffer: png, format: "png", width: 100, height: 100 },
    ]);
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("supports multi-page assembly with mixed dimensions", async () => {
    const png1 = await tinyPng(540, 540);
    const png2 = await tinyPng(540, 675); // 4:5
    const png3 = await tinyPng(540, 960); // 9:16
    const buf = await buildPdf([
      { buffer: png1, format: "png", width: 540, height: 540 },
      { buffer: png2, format: "png", width: 540, height: 675 },
      { buffer: png3, format: "png", width: 540, height: 960 },
    ]);
    // pdfkit emits a "/Count N" entry in the catalog/pages dict.
    const text = buf.toString("latin1");
    expect(text).toMatch(/\/Count\s+3/);
    // EOF marker present so downstream readers can validate.
    expect(text).toMatch(/%%EOF/);
  });

  it("rejects empty input rather than emitting a 0-page PDF", async () => {
    await expect(buildPdf([])).rejects.toThrow(/no pages/i);
  });
});
