// render.service — Cycle 2 정식 pipeline. SLO regression: 10 slides through
// the full wrap → screenshot → Sharp → archive path must complete under 60s.
//
// Chromium is mocked, so the wall-clock here measures the orchestration +
// Sharp + Archiver overhead — that is the part WE control. The real Chromium
// budget is exercised in the docker compose smoke (Step D).
import { describe, expect, it, vi } from "vitest";

const TINY_PNG = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082",
  "hex",
);

vi.mock("../src/services/browser-pool.js", () => ({
  withBrowser: vi.fn(
    async <T>(fn: (b: unknown) => Promise<T>): Promise<T> => {
      const fakePage = {
        setBypassCSP: vi.fn().mockResolvedValue(undefined),
        setJavaScriptEnabled: vi.fn().mockResolvedValue(undefined),
        setViewport: vi.fn().mockResolvedValue(undefined),
        setContent: vi.fn().mockResolvedValue(undefined),
        evaluate: vi.fn().mockResolvedValue(undefined),
        screenshot: vi.fn().mockResolvedValue(TINY_PNG),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const fakeBrowser = { newPage: vi.fn().mockResolvedValue(fakePage) };
      return fn(fakeBrowser);
    },
  ),
  acquireBrowser: vi.fn(),
  closeBrowser: vi.fn(),
  probeChromium: vi.fn(),
  getPoolStats: vi.fn(),
}));

import { renderCarousel } from "../src/services/render.service.js";
import type { RenderRequest } from "../src/types/render.types.js";

function buildSlides(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`,
    html: `<h1>Slide ${i + 1}</h1><p>본문 ${i + 1}</p>`,
  }));
}

describe("renderCarousel (Cycle 2)", () => {
  it("produces a zip + per-slide entries for 3 slides", async () => {
    const req: RenderRequest = {
      slides: buildSlides(3),
      aspectRatio: "1:1",
      format: "png",
    };
    const r = await renderCarousel(req, "job-3");
    expect(r.slides).toHaveLength(3);
    expect(r.slides[0]?.filename).toBe("slide-s1.png");
    expect(r.zip.slice(0, 4).toString("hex")).toBe("504b0304"); // zip magic
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("supports jpg + webp formats", async () => {
    const reqJpg: RenderRequest = {
      slides: buildSlides(2),
      aspectRatio: "4:5",
      format: "jpg",
    };
    const rJpg = await renderCarousel(reqJpg, "job-jpg");
    expect(rJpg.slides[0]?.filename).toMatch(/\.jpg$/);
    expect(rJpg.slides[0]?.mime).toBe("image/jpeg");

    const reqWebp: RenderRequest = {
      slides: buildSlides(2),
      aspectRatio: "9:16",
      format: "webp",
    };
    const rWebp = await renderCarousel(reqWebp, "job-webp");
    expect(rWebp.slides[0]?.filename).toMatch(/\.webp$/);
    expect(rWebp.slides[0]?.mime).toBe("image/webp");
  });

  it("SLO regression: 10 slides orchestration ≤ 60s", async () => {
    const req: RenderRequest = {
      slides: buildSlides(10),
      aspectRatio: "1:1",
      format: "png",
    };
    const startedAt = Date.now();
    const r = await renderCarousel(req, "job-slo");
    const elapsed = Date.now() - startedAt;
    expect(r.slides).toHaveLength(10);
    // Orchestration overhead alone must be a tiny fraction of the 60s SLO so
    // we have headroom for actual Chromium work in the smoke run. Cap at 30s
    // for the mocked path — anything more means an algorithmic regression.
    expect(elapsed).toBeLessThan(30_000);
    expect(r.zip.length).toBeGreaterThan(0);
  });

  // Cycle 3 — `pdf` returns a multi-page PDF Buffer (no zip when alone).
  it("format=pdf emits a PDF buffer next to PNG slides in the metadata", async () => {
    const req: RenderRequest = {
      slides: buildSlides(3),
      aspectRatio: "4:5",
      format: "pdf",
    };
    const r = await renderCarousel(req, "job-pdf");
    expect(r.pdf).toBeDefined();
    expect(r.pdf!.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    // PNG screenshots still produced for the PDF embed; ZIP is built but
    // route layer chooses the PDF body for the response.
    expect(r.slides[0]?.filename).toMatch(/\.png$/);
  });

  // Cycle 3 — `both` ships PNGs + PDF in the same zip.
  it("format=both packs the PDF inside the zip alongside per-slide PNGs", async () => {
    const req: RenderRequest = {
      slides: buildSlides(2),
      aspectRatio: "1:1",
      format: "both",
    };
    const r = await renderCarousel(req, "job-both");
    expect(r.pdf).toBeDefined();
    expect(r.zip.subarray(0, 4).toString("hex")).toBe("504b0304");
  });

  // Cycle 3 — `size` overrides the aspectRatio default (9:16 viewport).
  it("size override propagates to slide width/height", async () => {
    const req: RenderRequest = {
      slides: buildSlides(1),
      aspectRatio: "9:16",
      format: "png",
      size: { width: 1080, height: 1920 },
    };
    const r = await renderCarousel(req, "job-916");
    expect(r.slides[0]?.width).toBe(1080);
    expect(r.slides[0]?.height).toBe(1920);
  });
});
