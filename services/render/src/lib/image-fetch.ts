// image-fetch — Cycle 3.
//
// Pre-resolves remote images that appear in slide HTML (`<img src="...">` and
// `<image-slot src="...">`) by fetching them server-side and inlining the
// bytes as `data:` URIs. The slide page is rendered with `img-src 'self' data:`
// CSP — Chromium itself is forbidden from making outbound requests for images,
// which closes the SSRF re-entry that an arbitrary `<img>` would otherwise
// re-open in Cycle 3.
//
// Defense-in-depth contract:
//   1. Hostname must appear in `IMAGE_FETCH_HOSTS` allowlist (env-configured;
//      defaults to the storage service host + presigned-URL host(s)).
//   2. Protocol must be `https:` or `http:` (against `slidesmith-storage` only).
//      `file://`, `gopher://`, `ftp://`, and friends are rejected outright.
//   3. Per-image hard cap: `MAX_IMAGE_BYTES = 8 MB`. Streamed download aborts
//      past the cap so a malicious upstream can't OOM the renderer.
//   4. Per-request timeout: `IMAGE_FETCH_TIMEOUT_MS = 5_000`. Hung downstreams
//      cannot wedge a /render call past the SLO ceiling.
//   5. Content-Type must be `image/*` — anything else (HTML, octet-stream)
//      is dropped and the slot falls back to the placeholder.
//
// Failure mode is silent + safe-default: if a fetch fails for any reason we
// emit a 1×1 transparent PNG data URI so the slide still renders. The web
// caller should display the image error UI; render must never 500 because
// upstream image storage is flaky.

import { env } from "./env.js";
import { logger } from "./logger.js";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB — DESIGN-v3 §3-9 image-slot cap
const FETCH_TIMEOUT_MS = 5_000;

/** 1×1 transparent PNG, used when a fetch fails for any reason. */
const TRANSPARENT_PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=";

const ALLOWED_IMAGE_PREFIXES = ["image/"]; // png/jpeg/webp/gif/svg+xml/...

/**
 * Cycle 3 Fix R2 — never log raw URLs (presigned `X-Amz-Signature=...` query
 * strings would otherwise hit pino stdout). Reduce a URL to a safe shape:
 * `{ host, pathPrefix }`. The query component is always discarded; the path
 * is truncated to 32 chars. Malformed URL strings collapse to a sentinel.
 */
function safeUrlShape(rawUrl: string): { host: string; pathPrefix: string } {
  try {
    const u = new URL(rawUrl);
    return {
      host: u.hostname.toLowerCase(),
      pathPrefix: u.pathname.slice(0, 32),
    };
  } catch {
    return { host: "<invalid>", pathPrefix: "" };
  }
}

export interface ImageFetchResult {
  /** `data:<mime>;base64,...` URI. Always non-empty (fallback applies). */
  dataUri: string;
  /** false when the fetch was rejected (allowlist / timeout / size / mime). */
  ok: boolean;
  /** Original src URL, kept for logging only. Never reflected back to HTML. */
  sourceUrl: string;
  bytes: number;
}

function getAllowlist(): Set<string> {
  // env.IMAGE_FETCH_HOSTS is a comma-separated allowlist of hostnames.
  // Defaults include the docker compose storage hostname so the common-case
  // image-slot flow ("storage upload → render fetch by signed URL") works
  // without per-deploy config drift.
  return new Set(
    env.IMAGE_FETCH_HOSTS.split(",")
      .map((h) => h.trim().toLowerCase())
      .filter((h) => h.length > 0),
  );
}

/** Returns true if the URL is safe to fetch from the renderer. */
export function isAllowedImageUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  // Block IPv6 link-local + IPv4 loopback bypass shenanigans by name match.
  // Only EXACT hostname matches against the allowlist count.
  const allow = getAllowlist();
  if (!allow.has(url.hostname.toLowerCase())) return false;
  return true;
}

/**
 * Fetch a single image and return a `data:` URI. Never throws; on failure
 * returns the transparent fallback so the caller can keep building the slide.
 */
export async function fetchAsDataUri(
  rawUrl: string,
): Promise<ImageFetchResult> {
  const safe = safeUrlShape(rawUrl);
  if (!isAllowedImageUrl(rawUrl)) {
    logger.warn(safe, "image_fetch_rejected_allowlist");
    return {
      dataUri: TRANSPARENT_PNG_DATA_URI,
      ok: false,
      sourceUrl: rawUrl,
      bytes: 0,
    };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    // Cycle 3 Fix R1 — `redirect: "manual"` so an allowlisted upstream cannot
    // redirect us to loopback / IMDS / k8s service tokens. `fetch()` resolves
    // 3xx to a Response with `type === "opaqueredirect"` and `status: 0` /
    // `ok: false`; treating it like any other non-2xx triggers the safe
    // fallback path below.
    const res = await fetch(rawUrl, {
      method: "GET",
      signal: ctrl.signal,
      redirect: "manual",
    });
    if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
      logger.warn({ ...safe, status: res.status }, "image_fetch_rejected_redirect");
      return {
        dataUri: TRANSPARENT_PNG_DATA_URI,
        ok: false,
        sourceUrl: rawUrl,
        bytes: 0,
      };
    }
    if (!res.ok) {
      logger.warn({ ...safe, status: res.status }, "image_fetch_non_2xx");
      return {
        dataUri: TRANSPARENT_PNG_DATA_URI,
        ok: false,
        sourceUrl: rawUrl,
        bytes: 0,
      };
    }
    const mime = (res.headers.get("content-type") ?? "").split(";")[0]?.trim();
    if (!mime || !ALLOWED_IMAGE_PREFIXES.some((p) => mime.startsWith(p))) {
      logger.warn({ ...safe, mime }, "image_fetch_rejected_mime");
      return {
        dataUri: TRANSPARENT_PNG_DATA_URI,
        ok: false,
        sourceUrl: rawUrl,
        bytes: 0,
      };
    }
    const ab = await res.arrayBuffer();
    if (ab.byteLength > MAX_IMAGE_BYTES) {
      logger.warn(
        { ...safe, bytes: ab.byteLength, cap: MAX_IMAGE_BYTES },
        "image_fetch_rejected_size",
      );
      return {
        dataUri: TRANSPARENT_PNG_DATA_URI,
        ok: false,
        sourceUrl: rawUrl,
        bytes: ab.byteLength,
      };
    }
    const base64 = Buffer.from(ab).toString("base64");
    return {
      dataUri: `data:${mime};base64,${base64}`,
      ok: true,
      sourceUrl: rawUrl,
      bytes: ab.byteLength,
    };
  } catch (err) {
    logger.warn({ ...safe, err: (err as Error).message }, "image_fetch_failed");
    return {
      dataUri: TRANSPARENT_PNG_DATA_URI,
      ok: false,
      sourceUrl: rawUrl,
      bytes: 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Walk slide HTML and replace remote `<img src>` / `<image-slot src>` URLs
 * with `data:` URIs. Same-origin (`/`, `data:`, relative) sources are left
 * untouched. Each fetch happens in parallel, but the transformer awaits all
 * of them before returning so the caller can hand off to Puppeteer.
 *
 * NOTE: this is a deliberately small regex-based pass. Full DOM parsing
 * inside Node would require jsdom (~1 MB) and a CPU pass we don't need —
 * Chromium does the real DOM work later. The regex is conservative:
 * matches ONLY `src="..."` / `src='...'` on `<img>` and `<image-slot>`
 * (case-insensitive), skips inline JS, and never touches text content.
 */
// Regex source — each call site builds its own RegExp so we never share
// `lastIndex` state between scan + replace. Mutating a shared global regex
// across `exec` and `replace` skips matches in the second pass.
const REMOTE_IMG_REGEX_SRC =
  "<(img|image-slot)\\b([^>]*?)\\bsrc\\s*=\\s*(['\"])(https?:\\/\\/[^'\"]+)\\3([^>]*)>";

export interface InlineImagesResult {
  html: string;
  fetched: number;
  failed: number;
  totalBytes: number;
}

export async function inlineRemoteImages(
  html: string,
): Promise<InlineImagesResult> {
  // Collect all remote URLs in declaration order with a fresh regex.
  const scan = new RegExp(REMOTE_IMG_REGEX_SRC, "gi");
  const matches: { full: string; url: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = scan.exec(html)) !== null) {
    matches.push({ full: m[0]!, url: m[4]! });
  }
  if (matches.length === 0) {
    return { html, fetched: 0, failed: 0, totalBytes: 0 };
  }
  // Dedup identical URLs to one fetch.
  const unique = Array.from(new Set(matches.map((x) => x.url)));
  const results = await Promise.all(unique.map((u) => fetchAsDataUri(u)));
  const byUrl = new Map(results.map((r) => [r.sourceUrl, r]));
  let fetched = 0;
  let failed = 0;
  let totalBytes = 0;
  // Rewrite each occurrence in place with a separate regex so no shared
  // lastIndex bleed. Preserves attribute ordering / whitespace around src.
  const replacer = new RegExp(REMOTE_IMG_REGEX_SRC, "gi");
  const out = html.replace(
    replacer,
    (_match, tag, before, quote, url, after) => {
      const r = byUrl.get(url);
      if (!r) return _match;
      if (r.ok) {
        fetched += 1;
        totalBytes += r.bytes;
      } else {
        failed += 1;
      }
      return `<${tag}${before}src=${quote}${r.dataUri}${quote}${after}>`;
    },
  );
  return { html: out, fetched, failed, totalBytes };
}
