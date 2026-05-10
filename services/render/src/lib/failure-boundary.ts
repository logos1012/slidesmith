// Failure boundary — ARCH §8 row #5. Cycle 2: opossum CircuitBreaker wired
// into browser-pool's `withBrowser` helper.
//
// Defaults match SPEC §11 Cycle 2 acceptance:
//   - errorThresholdPercentage: 50  (open after a sustained burst of failures)
//   - resetTimeout:             60_000  (1 min open → halfOpen probe)
//   - timeout:                  30_000  (single render call ≤ 30s before tripping)
//
// Bulkhead (concurrency limit = 1) lives in browser-pool.ts via p-limit. The
// circuit breaker sits ON TOP of the bulkhead, so trips reflect actual
// Chromium failures rather than queue contention.
//
// Lifecycle events (open / halfOpen / close / fallback) are logged with the
// boundary name so /metrics dashboards can grep them in Cycle 3.
import CircuitBreaker from "opossum";
import { logger } from "./logger.js";

export interface BoundaryOptions {
  name: string;
  timeoutMs?: number;
  errorThresholdPercentage?: number;
  resetTimeoutMs?: number;
  /** Minimum requests in the rolling window before tripping. Default 5. */
  volumeThreshold?: number;
  /** Optional fallback. If provided, the breaker calls it when open. */
  fallback?: <TArgs extends unknown[], TResult>(
    ...args: TArgs
  ) => Promise<TResult>;
}

const DEFAULTS = {
  timeoutMs: 30_000,
  errorThresholdPercentage: 50,
  resetTimeoutMs: 60_000,
  volumeThreshold: 5,
};

export interface Boundary<TArgs extends unknown[], TResult> {
  (...args: TArgs): Promise<TResult>;
  /** Test/diag handle. */
  readonly breaker: CircuitBreaker;
}

export function createBoundary<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  opts: BoundaryOptions,
): Boundary<TArgs, TResult> {
  const breaker = new CircuitBreaker(fn, {
    timeout: opts.timeoutMs ?? DEFAULTS.timeoutMs,
    errorThresholdPercentage:
      opts.errorThresholdPercentage ?? DEFAULTS.errorThresholdPercentage,
    resetTimeout: opts.resetTimeoutMs ?? DEFAULTS.resetTimeoutMs,
    volumeThreshold: opts.volumeThreshold ?? DEFAULTS.volumeThreshold,
    name: opts.name,
    rollingCountTimeout: 60_000, // 1-minute rolling window
    rollingCountBuckets: 10,
  });

  if (opts.fallback) {
    breaker.fallback(opts.fallback);
  }

  breaker.on("open", () =>
    logger.warn({ boundary: opts.name }, "circuit_open"),
  );
  breaker.on("halfOpen", () =>
    logger.info({ boundary: opts.name }, "circuit_half_open"),
  );
  breaker.on("close", () =>
    logger.info({ boundary: opts.name }, "circuit_close"),
  );
  breaker.on("reject", () =>
    logger.warn({ boundary: opts.name }, "circuit_reject"),
  );
  breaker.on("timeout", () =>
    logger.warn({ boundary: opts.name }, "circuit_timeout"),
  );

  const wrapped = ((...args: TArgs) =>
    breaker.fire(...args) as Promise<TResult>) as Boundary<TArgs, TResult>;
  Object.defineProperty(wrapped, "breaker", { value: breaker });
  return wrapped;
}
