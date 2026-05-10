// image-fetch — Cycle 3.
// Verifies the SSRF-resistant inline pipeline: only allowlisted hosts via
// https/http, mime-type guard, byte cap, fallback to transparent PNG.
import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  vi,
} from "vitest";

import {
  fetchAsDataUri,
  inlineRemoteImages,
  isAllowedImageUrl,
} from "../src/lib/image-fetch.js";
import { logger } from "../src/lib/logger.js";

const ORIGINAL_FETCH = global.fetch;
const TINY_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
]);

function makeImageResponse(mime: string, body: Uint8Array): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": mime },
  });
}

/**
 * `Response` bodies are single-use streams — after one `.arrayBuffer()`
 * the same instance throws. Tests that mock multiple identical fetches
 * must therefore hand out a FRESH Response per call. Wrap with this
 * factory + `mockImplementation` instead of `mockResolvedValue`.
 */
function freshImageResponseFactory(mime: string, body: Uint8Array) {
  return () => Promise.resolve(makeImageResponse(mime, body));
}

describe("isAllowedImageUrl (allowlist)", () => {
  it("allows hostnames present in IMAGE_FETCH_HOSTS", () => {
    expect(isAllowedImageUrl("https://placehold.co/1080x1080")).toBe(true);
    expect(isAllowedImageUrl("http://slidesmith-storage:3003/blob/x")).toBe(
      true,
    );
  });
  it("rejects hostnames NOT in the allowlist (SSRF defense)", () => {
    expect(isAllowedImageUrl("http://localhost:3002/health")).toBe(false);
    expect(isAllowedImageUrl("http://127.0.0.1/")).toBe(false);
    expect(isAllowedImageUrl("http://169.254.169.254/latest/meta-data/")).toBe(
      false,
    );
    expect(isAllowedImageUrl("https://attacker.example.com/x.png")).toBe(false);
  });
  it("rejects file://, gopher://, and other non-http(s) schemes", () => {
    expect(isAllowedImageUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedImageUrl("gopher://placehold.co/")).toBe(false);
    expect(isAllowedImageUrl("ftp://placehold.co/x.png")).toBe(false);
  });
  it("rejects malformed URLs", () => {
    expect(isAllowedImageUrl("not a url")).toBe(false);
    expect(isAllowedImageUrl("")).toBe(false);
  });
});

describe("fetchAsDataUri", () => {
  beforeEach(() => {
    global.fetch = vi.fn() as typeof global.fetch;
  });
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
  });

  it("returns the transparent fallback for a non-allowlisted URL (no fetch)", async () => {
    const r = await fetchAsDataUri("https://attacker.example.com/x.png");
    expect(r.ok).toBe(false);
    expect(r.dataUri.startsWith("data:image/png;base64,iVBOR")).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("inlines a PNG response from an allowlisted host", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeImageResponse("image/png", TINY_PNG_BYTES),
    );
    const r = await fetchAsDataUri("https://placehold.co/1080x1080.png");
    expect(r.ok).toBe(true);
    expect(r.dataUri.startsWith("data:image/png;base64,")).toBe(true);
    expect(r.bytes).toBe(TINY_PNG_BYTES.byteLength);
  });

  it("rejects non-image content-types (HTML, octet-stream)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("<html>x</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );
    const r = await fetchAsDataUri("https://placehold.co/foo");
    expect(r.ok).toBe(false);
  });

  it("falls back on non-2xx responses", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("not found", { status: 404 }),
    );
    const r = await fetchAsDataUri("https://placehold.co/missing.png");
    expect(r.ok).toBe(false);
  });

  it("falls back when the upstream throws (network/timeout)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("ECONNREFUSED"),
    );
    const r = await fetchAsDataUri("https://placehold.co/x.png");
    expect(r.ok).toBe(false);
  });

  it("rejects payloads larger than 8MB cap", async () => {
    const huge = new Uint8Array(9 * 1024 * 1024);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeImageResponse("image/png", huge),
    );
    const r = await fetchAsDataUri("https://placehold.co/oversize.png");
    expect(r.ok).toBe(false);
    expect(r.bytes).toBe(huge.byteLength);
  });

  // Cycle 3 Fix R1 — TOCTOU redirect SSRF defense. With `redirect: "manual"`
  // a 3xx response from an allowlisted host must NOT be followed (otherwise an
  // attacker / misconfigured upstream pivots the renderer at IMDS / loopback).
  it("rejects 301 redirects from allowlisted hosts (TOCTOU SSRF defense)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(null, {
        status: 301,
        headers: { location: "http://169.254.169.254/latest/meta-data/" },
      }),
    );
    const r = await fetchAsDataUri("https://placehold.co/redirect.png");
    expect(r.ok).toBe(false);
    expect(r.dataUri.startsWith("data:image/png;base64,iVBOR")).toBe(true);
    // Single fetch only — no follow.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    // The fetch call must have requested manual redirect handling.
    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs?.[1]?.redirect).toBe("manual");
  });

  it("rejects 302 redirects from allowlisted hosts to off-allowlist targets", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://localhost:3002/health" },
      }),
    );
    const r = await fetchAsDataUri("https://placehold.co/r2.png");
    expect(r.ok).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("still serves 200 responses from allowlisted hosts (regression guard)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeImageResponse("image/png", TINY_PNG_BYTES),
    );
    const r = await fetchAsDataUri("https://placehold.co/ok.png");
    expect(r.ok).toBe(true);
    expect(r.dataUri.startsWith("data:image/png;base64,")).toBe(true);
  });
});

// Cycle 3 Fix R2 — signed URL plaintext logging defense. Failure-path log
// fields must contain only `{ host, pathPrefix }` — never the search component
// (X-Amz-Signature, X-Amz-Credential, etc).
describe("fetchAsDataUri — R2 signed URL log redaction", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    global.fetch = vi.fn() as typeof global.fetch;
    warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    warnSpy.mockRestore();
  });

  function expectNoSecretInWarnCalls() {
    const serialized = JSON.stringify(warnSpy.mock.calls);
    expect(serialized).not.toMatch(/X-Amz-Signature/i);
    expect(serialized).not.toMatch(/X-Amz-Credential/i);
    expect(serialized).not.toMatch(/AKIA[A-Z0-9]+/);
    expect(serialized).not.toMatch(/DEADBEEF99887766/);
    // The full URL with query string must not appear at all.
    expect(serialized).not.toMatch(/\?X-Amz-/i);
  }

  const SIGNED =
    "https://placehold.co/secret-asset.png" +
    "?X-Amz-Algorithm=AWS4-HMAC-SHA256" +
    "&X-Amz-Credential=AKIATEST123/20260510/ap-northeast-2/s3/aws4_request" +
    "&X-Amz-Date=20260510T120000Z" +
    "&X-Amz-Expires=900" +
    "&X-Amz-SignedHeaders=host" +
    "&X-Amz-Signature=DEADBEEF99887766";

  it("does not log the signed query string on rejected_allowlist", async () => {
    const offAllowlist = SIGNED.replace("placehold.co", "attacker.example.com");
    await fetchAsDataUri(offAllowlist);
    expect(warnSpy).toHaveBeenCalled();
    expectNoSecretInWarnCalls();
    // The first arg should expose host + pathPrefix only, no search.
    const firstArg = warnSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(firstArg.host).toBe("attacker.example.com");
    expect(typeof firstArg.pathPrefix).toBe("string");
    expect(firstArg.url).toBeUndefined();
  });

  it("does not log the signed query string on non-2xx", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("not found", { status: 404 }),
    );
    await fetchAsDataUri(SIGNED);
    expectNoSecretInWarnCalls();
  });

  it("does not log the signed query string on rejected_mime", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("html", { status: 200, headers: { "content-type": "text/html" } }),
    );
    await fetchAsDataUri(SIGNED);
    expectNoSecretInWarnCalls();
  });

  it("does not log the signed query string on rejected_size", async () => {
    const huge = new Uint8Array(9 * 1024 * 1024);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeImageResponse("image/png", huge),
    );
    await fetchAsDataUri(SIGNED);
    expectNoSecretInWarnCalls();
  });

  it("does not log the signed query string on network failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("ECONNREFUSED"),
    );
    await fetchAsDataUri(SIGNED);
    expectNoSecretInWarnCalls();
  });

  it("does not log the signed query string on rejected_redirect (R1+R2 combined)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(null, {
        status: 301,
        headers: { location: "http://169.254.169.254/latest/meta-data/" },
      }),
    );
    await fetchAsDataUri(SIGNED);
    expectNoSecretInWarnCalls();
  });
});

describe("inlineRemoteImages", () => {
  beforeEach(() => {
    global.fetch = vi.fn() as typeof global.fetch;
  });
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
  });

  it("leaves HTML without remote images untouched", async () => {
    const html = '<h1>안녕</h1><img src="data:image/png;base64,xx">';
    const r = await inlineRemoteImages(html);
    expect(r.html).toBe(html);
    expect(r.fetched).toBe(0);
    expect(r.failed).toBe(0);
  });

  it("rewrites <img> AND <image-slot> remote URLs to data: URIs", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      freshImageResponseFactory("image/png", TINY_PNG_BYTES),
    );
    const html =
      '<img src="https://placehold.co/a.png" alt="a">' +
      '<image-slot src="https://placehold.co/b.png"></image-slot>';
    const r = await inlineRemoteImages(html);
    expect(r.fetched).toBe(2);
    expect(r.html).not.toContain("https://placehold.co/a.png");
    expect(r.html).not.toContain("https://placehold.co/b.png");
    expect(r.html).toContain("data:image/png;base64,");
  });

  it("dedups identical URLs to a single fetch", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      freshImageResponseFactory("image/png", TINY_PNG_BYTES),
    );
    const html =
      '<img src="https://placehold.co/x.png">' +
      '<img src="https://placehold.co/x.png">' +
      '<img src="https://placehold.co/x.png">';
    const r = await inlineRemoteImages(html);
    expect(r.fetched).toBe(3); // 3 occurrences in HTML
    expect(global.fetch).toHaveBeenCalledTimes(1); // 1 actual fetch
  });

  it("counts failed fetches separately and falls back to transparent PNG", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network"),
    );
    const html = '<img src="https://placehold.co/x.png">';
    const r = await inlineRemoteImages(html);
    expect(r.fetched).toBe(0);
    expect(r.failed).toBe(1);
    expect(r.html).toContain("data:image/png;base64,iVBOR");
  });
});
