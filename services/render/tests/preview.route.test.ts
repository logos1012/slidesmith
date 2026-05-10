// GET/POST /preview/:slideId — Cycle 2 cache + serve. We mock the preview
// service so the test never touches Chromium/Sharp; the cache is exercised
// by tests/preview.service.test.ts directly.
import { describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../src/services/browser-pool.js", () => ({
  probeChromium: vi.fn().mockResolvedValue({ available: true, version: "test" }),
  getPoolStats: vi.fn().mockReturnValue({ active: 0, idle: 1 }),
  closeBrowser: vi.fn(),
  withBrowser: vi.fn(),
}));

const FAKE_PNG = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082",
  "hex",
);

const renderPreviewMock = vi.fn();
vi.mock("../src/services/preview.service.js", () => ({
  renderPreview: (...args: unknown[]) => renderPreviewMock(...args),
  buildCacheKey: vi.fn(),
  clearPreviewCache: vi.fn(),
  getPreviewCacheStats: vi.fn(),
}));

import { createApp } from "../src/server.js";

describe("POST /preview/:slideId", () => {
  it("returns 400 when html is missing", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/preview/slide-1")
      .send({ aspectRatio: "1:1" });
    expect(res.status).toBe(400);
  });

  it("serves PNG with HIT/MISS cache header", async () => {
    renderPreviewMock.mockResolvedValueOnce({
      slideId: "slide-1",
      aspectRatio: "1:1",
      mime: "image/png",
      bytes: FAKE_PNG.length,
      buffer: FAKE_PNG,
      fromCache: false,
    });

    const app = createApp();
    const res = await request(app)
      .post("/preview/slide-1")
      .send({ html: "<h1>Hello</h1>", aspectRatio: "1:1" })
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c: Buffer) => chunks.push(c));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toBe("image/png");
    expect(res.header["x-preview-cache"]).toBe("MISS");
    expect(res.header["x-preview-slide-id"]).toBe("slide-1");
    expect((res.body as Buffer).slice(0, 8).toString("hex")).toBe(
      "89504e470d0a1a0a",
    );
  });

  it("reports HIT on cache reuse", async () => {
    renderPreviewMock.mockResolvedValueOnce({
      slideId: "slide-2",
      aspectRatio: "4:5",
      mime: "image/png",
      bytes: FAKE_PNG.length,
      buffer: FAKE_PNG,
      fromCache: true,
    });

    const app = createApp();
    const res = await request(app)
      .post("/preview/slide-2")
      .send({ html: "<h1>Hi</h1>" });
    expect(res.status).toBe(200);
    expect(res.header["x-preview-cache"]).toBe("HIT");
  });

  it("returns 500 with PreviewFailed when service throws", async () => {
    renderPreviewMock.mockRejectedValueOnce(new Error("boom"));
    const app = createApp();
    const res = await request(app)
      .post("/preview/slide-3")
      .send({ html: "<h1>x</h1>" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("PreviewFailed");
  });
});

describe("GET /preview/:slideId", () => {
  it("returns 400 with a useful message until the GET path is wired", async () => {
    const app = createApp();
    const res = await request(app).get("/preview/slide-x");
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("POST /preview");
  });
});
