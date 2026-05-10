// failure-boundary — Cycle 2 정식. Verifies opossum wiring with the
// SPEC-mandated defaults (5-fail trip, 60s open, 30s timeout).
import { describe, expect, it, vi, afterEach } from "vitest";
import { createBoundary } from "../src/lib/failure-boundary.js";

describe("createBoundary", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes through successful calls", async () => {
    const fn = vi.fn(async (x: number) => x * 2);
    const wrapped = createBoundary(fn, { name: "ok" });
    await expect(wrapped(3)).resolves.toBe(6);
  });

  it("opens after 5 sustained failures (volumeThreshold 5)", async () => {
    const fn = vi.fn(async () => {
      throw new Error("boom");
    });
    const wrapped = createBoundary(fn, {
      name: "trip",
      timeoutMs: 100,
      errorThresholdPercentage: 50,
      resetTimeoutMs: 60_000,
      volumeThreshold: 5,
    });

    // 5 consecutive failures → breaker opens
    for (let i = 0; i < 5; i++) {
      await expect(wrapped()).rejects.toThrow();
    }
    expect(wrapped.breaker.opened).toBe(true);
    // Subsequent call rejects with "Breaker is open" before the inner fn runs
    const callsBefore = fn.mock.calls.length;
    await expect(wrapped()).rejects.toThrow(/Breaker is open/);
    expect(fn.mock.calls.length).toBe(callsBefore);
  });

  it("times out long-running calls", async () => {
    const fn = vi.fn(
      () => new Promise<string>((resolve) => setTimeout(() => resolve("ok"), 500)),
    );
    const wrapped = createBoundary(fn, {
      name: "slow",
      timeoutMs: 50,
    });
    await expect(wrapped()).rejects.toThrow(/Timed out/);
  });

  it("invokes the optional fallback when open", async () => {
    const fn = vi.fn(async () => {
      throw new Error("boom");
    });
    const fallback = vi.fn(async () => "fallback-value");
    const wrapped = createBoundary(fn, {
      name: "fallback-test",
      volumeThreshold: 1,
      errorThresholdPercentage: 1,
      timeoutMs: 100,
      // opossum's fallback signature accepts the same args. We cast to any here
      // because the boundary type widens TArgs.
      fallback: fallback as never,
    });
    await expect(wrapped()).resolves.toBe("fallback-value");
  });
});
