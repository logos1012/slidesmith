// Cycle 2 Fix — security regression tests (R1 / R2 / R3 / R5 / N5).
//
// These tests prove the Cycle 2 review/test reproductions are now blocked.
// Run with: pnpm test tests/security.test.ts
import { describe, expect, it, vi } from "vitest";
import request from "supertest";

const TINY_PNG = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082",
  "hex",
);

// Track JS-disable + CSP enforcement on the fake Page.
const setJSEnabledCalls: boolean[] = [];
const setBypassCSPCalls: boolean[] = [];

vi.mock("../src/services/browser-pool.js", () => ({
  probeChromium: vi
    .fn()
    .mockResolvedValue({ available: true, version: "test" }),
  getPoolStats: vi.fn().mockReturnValue({ active: 0, idle: 1 }),
  closeBrowser: vi.fn(),
  withBrowser: vi.fn(
    async <T>(fn: (b: unknown) => Promise<T>): Promise<T> => {
      const fakePage = {
        setBypassCSP: vi.fn(async (v: boolean) => {
          setBypassCSPCalls.push(v);
        }),
        setJavaScriptEnabled: vi.fn(async (v: boolean) => {
          setJSEnabledCalls.push(v);
        }),
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
}));

import { createApp } from "../src/server.js";
import { wrapSlideHtml } from "../src/lib/slide-html.js";

describe("R1 — defense-in-depth on slide page (CSP + JS disabled)", () => {
  it("emits a strict CSP <meta> with script-src 'none' + connect-src 'none'", () => {
    const html = wrapSlideHtml({
      slideHtml: "<h1>x</h1>",
      aspectRatio: "1:1",
    });
    expect(html).toMatch(
      /<meta http-equiv="Content-Security-Policy"[^>]*script-src 'none'/,
    );
    expect(html).toMatch(
      /<meta http-equiv="Content-Security-Policy"[^>]*connect-src 'none'/,
    );
    expect(html).toMatch(
      /<meta http-equiv="Content-Security-Policy"[^>]*default-src 'none'/,
    );
  });

  it("calls setJavaScriptEnabled(false) on every render page", async () => {
    setJSEnabledCalls.length = 0;
    setBypassCSPCalls.length = 0;
    const app = createApp();
    await request(app)
      .post("/render")
      .send({
        slides: [
          { id: "a", html: "<p>x</p>" },
          { id: "b", html: "<p>y</p>" },
        ],
        format: "png",
      });
    // 2 slides → 2 page-level JS-disable + CSP-lock calls.
    expect(setJSEnabledCalls).toEqual([false, false]);
    expect(setBypassCSPCalls).toEqual([false, false]);
  });
});

describe("R2 — slide.id zip-slip blocked at the schema", () => {
  it("400s on path-traversal id", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({
        slides: [{ id: "../../etc/cron.d/exploit", html: "<p>x</p>" }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("BadRequest");
  });

  it("400s on absolute path id", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({ slides: [{ id: "/etc/passwd", html: "<p>x</p>" }] });
    expect(res.status).toBe(400);
  });

  it("accepts a clean id", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({ slides: [{ id: "slide_01", html: "<p>x</p>" }] });
    expect(res.status).toBe(200);
  });
});

describe("R3 — correlationId regex blocks header injection", () => {
  it("400s on Content-Disposition split payload", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({
        slides: [{ id: "x", html: "<p>x</p>" }],
        correlationId: '"; filename="poisoned.exe',
      });
    expect(res.status).toBe(400);
  });

  it("400s on a CRLF payload", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({
        slides: [{ id: "x", html: "<p>x</p>" }],
        correlationId: "abc\r\nSet-Cookie: x=y",
      });
    expect(res.status).toBe(400);
  });

  it("accepts a clean correlationId + reflects it in headers", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({
        slides: [{ id: "x", html: "<p>x</p>" }],
        correlationId: "corr_safe-123",
      });
    expect(res.status).toBe(200);
    expect(res.header["x-render-job-id"]).toBe("corr_safe-123");
    expect(res.header["content-disposition"]).toBe(
      'attachment; filename="slidesmith-corr_safe-123.zip"',
    );
  });
});

describe("R5 — html size cap returns 400 (not opaque 500)", () => {
  it("400s a 600KB single slide html via Zod field error", async () => {
    const big = "<p>" + "a".repeat(600_000) + "</p>";
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({ slides: [{ id: "x", html: big }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("BadRequest");
  });
});

describe("N5 — Brand DSL strict invariant: no --brand-* DEFINITIONS outside .slide-preview-container", () => {
  it("never defines --brand-* on :root or body, only inside the scoped class", () => {
    const html = wrapSlideHtml({
      slideHtml: "<p>x</p>",
      aspectRatio: "1:1",
      brandDSL: { colors: { primary: "#abcdef", accent: "#123456" } },
    });
    expect(html).not.toContain(":root");
    // Strip every CSS rule whose selector list includes .slide-preview-container.
    // What remains MUST NOT define `--brand-*: VALUE` (consumption via
    // `var(--brand-*)` is fine — that's not a leak).
    const stripped = html.replace(
      /[^{}]*\.slide-preview-container[^{}]*\{[\s\S]*?\}/g,
      "",
    );
    // Only definitions: `--brand-foo: …;`
    expect(stripped).not.toMatch(/--brand-[\w-]+\s*:/);
  });
});

// Cycle 3 — `size` is reintroduced as a real, validated field (not silent
// drift). It must be inside [256..4096]^2 OR omitted; values outside the
// bounds 400. The R6 test now asserts the bounds, not a no-op.
describe("R6 — `size` field is bounded to [256..4096]", () => {
  it("400s when width is below 256", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({
        slides: [{ id: "x", html: "<p>x</p>" }],
        size: { width: 100, height: 1000 },
      });
    expect(res.status).toBe(400);
  });
  it("400s when height is above 4096", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({
        slides: [{ id: "x", html: "<p>x</p>" }],
        size: { width: 1080, height: 16384 },
      });
    expect(res.status).toBe(400);
  });
  it("accepts the canonical 1080x1920 (9:16)", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/render")
      .send({
        slides: [{ id: "x", html: "<p>x</p>" }],
        size: { width: 1080, height: 1920 },
      });
    expect(res.status).toBe(200);
  });
});
