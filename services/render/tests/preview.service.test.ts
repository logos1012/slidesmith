// preview.service — Cycle 2 정식. Tests the LRU cache without launching
// Chromium by mocking the `withBrowser` helper. We assert the cache key
// composition + HIT-after-MISS behaviour.
import { describe, expect, it, vi, beforeEach } from "vitest";

const TINY_PNG = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082",
  "hex",
);

const withBrowserMock = vi.fn(
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
);

vi.mock("../src/services/browser-pool.js", () => ({
  withBrowser: (fn: unknown) =>
    withBrowserMock(fn as (b: unknown) => Promise<unknown>),
  acquireBrowser: vi.fn(),
  closeBrowser: vi.fn(),
  probeChromium: vi.fn(),
  getPoolStats: vi.fn(),
}));

import {
  buildCacheKey,
  clearPreviewCache,
  renderPreview,
} from "../src/services/preview.service.js";

describe("preview.service cache (Cycle 2)", () => {
  beforeEach(() => {
    clearPreviewCache();
    withBrowserMock.mockClear();
  });

  it("hashes slideId + aspectRatio + html + brandDSL into a stable key", () => {
    const a = buildCacheKey({
      slideId: "s1",
      html: "<p>x</p>",
      aspectRatio: "1:1",
    });
    const b = buildCacheKey({
      slideId: "s1",
      html: "<p>x</p>",
      aspectRatio: "1:1",
    });
    const c = buildCacheKey({
      slideId: "s1",
      html: "<p>x</p>",
      aspectRatio: "4:5",
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("MISS → cache → HIT (only one withBrowser call)", async () => {
    const req = {
      slideId: "preview-1",
      html: "<h1>Hello</h1>",
      aspectRatio: "1:1" as const,
    };
    const first = await renderPreview(req);
    expect(first.fromCache).toBe(false);
    const second = await renderPreview(req);
    expect(second.fromCache).toBe(true);
    expect(withBrowserMock).toHaveBeenCalledTimes(1);
    expect(second.buffer).toEqual(first.buffer);
  });

  it("differentiates entries by aspectRatio", async () => {
    await renderPreview({
      slideId: "p2",
      html: "<p>x</p>",
      aspectRatio: "1:1",
    });
    const second = await renderPreview({
      slideId: "p2",
      html: "<p>x</p>",
      aspectRatio: "4:5",
    });
    expect(second.fromCache).toBe(false);
    expect(withBrowserMock).toHaveBeenCalledTimes(2);
  });

  it("differentiates entries by html change", async () => {
    await renderPreview({
      slideId: "p3",
      html: "<p>v1</p>",
      aspectRatio: "1:1",
    });
    const second = await renderPreview({
      slideId: "p3",
      html: "<p>v2</p>",
      aspectRatio: "1:1",
    });
    expect(second.fromCache).toBe(false);
    expect(withBrowserMock).toHaveBeenCalledTimes(2);
  });

  // Cycle 2 Fix R7 — single-flight dedup. Two concurrent identical hits must
  // collapse onto ONE withBrowser call instead of N parallel renders.
  it("dedups concurrent identical requests onto a single render", async () => {
    const req = {
      slideId: "stampede",
      html: "<p>same</p>",
      aspectRatio: "1:1" as const,
    };
    const [a, b, c] = await Promise.all([
      renderPreview(req),
      renderPreview(req),
      renderPreview(req),
    ]);
    expect(withBrowserMock).toHaveBeenCalledTimes(1);
    // First-arrived sees fromCache=false, followers see fromCache=true (they
    // joined the in-flight promise — semantically a cache hit).
    const fromCacheFlags = [a.fromCache, b.fromCache, c.fromCache].sort();
    expect(fromCacheFlags).toEqual([false, true, true]);
    expect(a.buffer).toEqual(b.buffer);
    expect(a.buffer).toEqual(c.buffer);
  });
});
