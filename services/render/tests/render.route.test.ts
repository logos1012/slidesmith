// POST /render — Cycle 2 정식 pipeline. Mocks browser-pool's `withBrowser`
// + `closeBrowser` so the test never launches Chromium, then asserts that
// the route streams a binary zip with the expected headers.
import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import archiver from "archiver";

// Build a real-but-stubbed zip so the supertest binary parser sees plausible
// content. Each "screenshot" is a 1×1 PNG byte sequence.
const TINY_PNG = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082",
  "hex",
);

vi.mock("../src/services/browser-pool.js", () => ({
  probeChromium: vi.fn().mockResolvedValue({ available: true, version: "test" }),
  getPoolStats: vi.fn().mockReturnValue({ active: 0, idle: 1 }),
  closeBrowser: vi.fn(),
  // The Cycle 2 service uses withBrowser as the entry point. We don't actually
  // launch Chromium; we let the inner callback run with a fake browser whose
  // `newPage` returns a minimal Page-like object that yields TINY_PNG.
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
      const fakeBrowser = {
        newPage: vi.fn().mockResolvedValue(fakePage),
      };
      return fn(fakeBrowser);
    },
  ),
}));

import { createApp } from "../src/server.js";

describe("POST /render (Cycle 2)", () => {
  it("returns 400 on empty slides array", async () => {
    const app = createApp();
    const res = await request(app).post("/render").send({ slides: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("BadRequest");
  });

  it("returns 200 application/zip for 3 slides", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({
        slides: [
          { id: "1", html: "<h1>Slide 1</h1>" },
          { id: "2", html: "<h1>Slide 2</h1>" },
          { id: "3", html: "<h1>Slide 3</h1>" },
        ],
        aspectRatio: "1:1",
        format: "png",
        correlationId: "corr-test-1",
      })
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toBe("application/zip");
    expect(res.header["x-render-job-id"]).toBe("corr-test-1");
    expect(Number(res.header["x-render-slide-count"])).toBe(3);
    expect(Number(res.header["x-render-duration-ms"])).toBeGreaterThanOrEqual(0);
    // Zip magic number: 'PK\x03\x04'
    expect((res.body as Buffer).slice(0, 4).toString("hex")).toBe("504b0304");
  });

  it("rejects unknown format", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({
        slides: [{ id: "x", html: "<p>x</p>" }],
        format: "tiff",
      });
    expect(res.status).toBe(400);
  });

  // Cycle 3 — `pdf` ships application/pdf body (no zip envelope).
  it("format=pdf returns application/pdf body with %PDF- magic", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({
        slides: [
          { id: "1", html: "<h1>A</h1>" },
          { id: "2", html: "<h1>B</h1>" },
        ],
        format: "pdf",
        aspectRatio: "1:1",
      })
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c: Buffer) => chunks.push(c));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toBe("application/pdf");
    expect(res.header["content-disposition"]).toMatch(/\.pdf"$/);
    expect((res.body as Buffer).subarray(0, 5).toString("ascii")).toBe(
      "%PDF-",
    );
  });

  // Cycle 3 — `both` packs PNGs + PDF in the same zip, and exposes pdf bytes.
  it("format=both returns ZIP with X-Render-Pdf-Bytes header", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({
        slides: [{ id: "x", html: "<h1>x</h1>" }],
        format: "both",
      })
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c: Buffer) => chunks.push(c));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toBe("application/zip");
    expect(Number(res.header["x-render-pdf-bytes"])).toBeGreaterThan(0);
  });

  // Cycle 3 — `size` accepts well-formed dims and rejects out-of-range.
  it("size override accepted within [256..4096]", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({
        slides: [{ id: "1", html: "<h1>9:16</h1>" }],
        format: "png",
        size: { width: 1080, height: 1920 },
      });
    expect(res.status).toBe(200);
  });

  it("size override rejected when out of bounds", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({
        slides: [{ id: "1", html: "<h1>x</h1>" }],
        size: { width: 100, height: 100 },
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("BadRequest");
  });
});

// Helper-only import is referenced via the zip magic check above; the
// `archiver` import lives at the top so vitest hoists it cleanly under v8
// coverage, otherwise the dist transform reorders the dynamic require.
void archiver;
