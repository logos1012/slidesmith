// Browser pool — SPEC §7. Lazy launch, single Chromium instance for solo PoC,
// p-limit(1) bulkhead, auto-respawn on disconnect. SIGTERM cleanup is wired in
// server.ts (single owner of process lifecycle).
//
// Cycle 2: `withBrowser` is wrapped in a failure-boundary (opossum) on top of
// the bulkhead — Chromium-side faults trip the breaker after 5 sustained
// failures, opening for 60s, and re-probe via a half-open call. See
// `lib/failure-boundary.ts`.
import puppeteer, { type Browser } from "puppeteer-core";
import pLimit, { type LimitFunction } from "p-limit";
import { env } from "../lib/env.js";
import { createBoundary } from "../lib/failure-boundary.js";
import { logger } from "../lib/logger.js";
import type { BrowserPoolStats } from "../types/render.types.js";

// SPEC §7: pool size pinned to 1. Two concurrent Chromiums on a Mac mini
// exceed the 1.5GB memory cap. If Cycle 3 SLO ever forces multi-browser,
// this becomes a real pool with N actual Browser instances (not a per-page
// concurrency knob).
const POOL_SIZE = 1;
const limit: LimitFunction = pLimit(POOL_SIZE);

let browser: Browser | null = null;
let launching: Promise<Browser> | null = null;

// Cycle 2 Fix R1: dropped `--disable-web-security` and
// `--allow-file-access-from-files`. Untrusted slide HTML must NEVER be able to
// (a) cross-origin XHR to docker-internal siblings (SSRF) or (b) read file://.
// Defense in depth — see also CSP <meta> in wrapSlideHtml + setJavaScriptEnabled
// in render.service / preview.service.
const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--font-render-hinting=none",
  "--disable-dev-shm-usage", // Docker shared memory safety
];

async function launch(): Promise<Browser> {
  logger.info(
    { executablePath: env.PUPPETEER_EXECUTABLE_PATH },
    "browser_launch_start",
  );
  // puppeteer-core v23: `headless: true` IS the new headless mode (Chrome 112+).
  // SPEC §7 historically said `headless: 'new'`; that string was the v20-era
  // opt-in flag. v23 dropped the literal in favour of `boolean | 'shell'`.
  // See https://developer.chrome.com/articles/new-headless/.
  const b = await puppeteer.launch({
    executablePath: env.PUPPETEER_EXECUTABLE_PATH,
    headless: true,
    args: LAUNCH_ARGS,
  });
  b.on("disconnected", () => {
    logger.warn("browser_disconnected");
    browser = null;
  });
  logger.info("browser_launch_done");
  return b;
}

/**
 * Lazy-acquire the singleton browser. Concurrent callers share one in-flight
 * launch promise, so we never spawn two Chromiums on a cold start.
 *
 * `browser.connected` is a getter (puppeteer-core v23 deprecated the
 * legacy `isConnected()` method). Don't "fix" this back to `isConnected()`.
 */
export async function acquireBrowser(): Promise<Browser> {
  if (browser?.connected) return browser;
  if (!launching) {
    launching = launch().finally(() => {
      launching = null;
    });
  }
  browser = await launching;
  return browser;
}

/**
 * The boundary fires `runWithBrowser` — bulkhead acquire + user fn — under
 * a single circuit breaker. Defaults: 5-fail trip, 1-min open, 30s timeout.
 *
 * NOTE: opossum types the wrapped fn as `(...args) => Promise<unknown>`. We
 * fire it with a single `unknown` payload (the user's callback) and re-cast
 * the result on the way out — runtime contract preserved.
 */
async function runWithBrowser(
  fn: (b: Browser) => Promise<unknown>,
): Promise<unknown> {
  return limit(async () => {
    const b = await acquireBrowser();
    return fn(b);
  });
}

const boundary = createBoundary(runWithBrowser, {
  name: "render.browser",
  timeoutMs: 30_000,
  errorThresholdPercentage: 50,
  resetTimeoutMs: 60_000,
  volumeThreshold: 5,
});

/**
 * Run an operation with the shared browser, gated by the bulkhead semaphore
 * AND the failure-boundary circuit breaker (Cycle 2 wiring).
 */
export function withBrowser<T>(fn: (b: Browser) => Promise<T>): Promise<T> {
  return boundary(fn as (b: Browser) => Promise<unknown>) as Promise<T>;
}

/** Test-only: expose the breaker for assertions. */
export const _internal = {
  boundary,
};

export async function closeBrowser(): Promise<void> {
  if (browser) {
    const b = browser;
    browser = null;
    try {
      await b.close();
      logger.info("browser_closed");
    } catch (err) {
      logger.error({ err }, "browser_close_failed");
    }
  }
}

/**
 * Best-effort Chromium version probe used by /health. Never throws — health
 * must report "available: false" instead of crashing the endpoint.
 */
export async function probeChromium(): Promise<{
  available: boolean;
  version: string | null;
}> {
  try {
    const b = await acquireBrowser();
    const version = await b.version();
    return { available: true, version };
  } catch (err) {
    logger.error({ err }, "chromium_probe_failed");
    return { available: false, version: null };
  }
}

/**
 * Returns:
 *   - `active`: 1 while a render is mid-flight (limit.activeCount), 0 otherwise.
 *   - `idle`:   1 if the browser is launched and currently free, 0 if no
 *               browser is up OR if the only slot is busy.
 *
 * For POOL_SIZE = 1 this collapses to: active + idle ≤ 1, and the pair only
 * sums to 1 once Chromium has actually launched.
 */
export function getPoolStats(): BrowserPoolStats {
  const active = limit.activeCount;
  const browserUp = browser?.connected === true;
  const idle = browserUp && active === 0 ? 1 : 0;
  return { active, idle };
}
