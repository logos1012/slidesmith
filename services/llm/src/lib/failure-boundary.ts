// src/lib/failure-boundary.ts — opossum Circuit Breaker + Bulkhead.
// SPEC: SERVICE-llm.md §7. Cycle 2 Fix P1-2 — semantics pinned:
//   "5 consecutive failures (5 of 5 fail) → breaker opens for 30 minutes.
//    Any single success resets the consecutive-failure counter."
// Why a custom counter?
//   opossum's volumeThreshold/errorThresholdPercentage measures rolling-window
//   failure RATE, not strict consecutiveness. (e.g. "5 of 5 fail" is 100% but
//   opossum requires the percentage to be STRICTLY GREATER THAN the threshold
//   to open — so threshold=100 never opens.) We instead drive opossum's open()
//   manually based on a consecutive-failure tally we own. This is the simplest
//   way to get the SPEC's "5 of 5" semantic without ambiguity.
// Per-vendor timeouts honor SPEC §7 table (Claude/SDK 60s, Gemini 90s).

import CircuitBreaker from 'opossum';
import pLimit from 'p-limit';
import { logger } from './logger.js';

const FIVE_FAIL = 5;
const THIRTY_MIN_MS = 30 * 60 * 1000;
export type BreakerName = 'claude-cli' | 'anthropic-sdk' | 'gemini-python';
const TIMEOUTS_MS: Record<BreakerName, number> = {
  // SPEC §7 table.
  'claude-cli': 60_000,
  'anthropic-sdk': 60_000,
  'gemini-python': 90_000,
};

export interface BreakerState {
  name: BreakerName;
  state: 'open' | 'halfOpen' | 'closed';
  failures: number;
  successes: number;
  lastFailureAt: string | null;
}

const breakers = new Map<BreakerName, CircuitBreaker<unknown[], unknown>>();
const lastFailureAt = new Map<BreakerName, string>();
// Strict consecutive-failure counter, owned outside opossum.
const consecutiveFails = new Map<BreakerName, number>();

function makeBreaker(name: BreakerName): CircuitBreaker<unknown[], unknown> {
  const cb = new CircuitBreaker(async (fn: unknown) => (fn as () => Promise<unknown>)(), {
    timeout: TIMEOUTS_MS[name],
    // We don't rely on opossum's percentage path; set extreme values so it
    // never auto-opens by rate. Our consecutive counter drives cb.open().
    errorThresholdPercentage: 100,
    volumeThreshold: Number.MAX_SAFE_INTEGER,
    resetTimeout: THIRTY_MIN_MS,
    name,
  });
  cb.on('open', () => logger.warn({ breaker: name }, 'circuit_open'));
  cb.on('halfOpen', () => {
    // On half-open the next attempt decides; reset our counter so a single
    // success closes us cleanly.
    consecutiveFails.set(name, 0);
    logger.info({ breaker: name }, 'circuit_half_open');
  });
  cb.on('close', () => {
    consecutiveFails.set(name, 0);
    logger.info({ breaker: name }, 'circuit_close');
  });
  cb.on('success', () => {
    consecutiveFails.set(name, 0);
  });
  cb.on('failure', () => {
    lastFailureAt.set(name, new Date().toISOString());
    const next = (consecutiveFails.get(name) ?? 0) + 1;
    consecutiveFails.set(name, next);
    if (next >= FIVE_FAIL && !cb.opened) {
      // Force-open: SPEC "5 of 5 fail → open" semantic.
      cb.open();
    }
  });
  return cb;
}

export function getBreaker(name: BreakerName): CircuitBreaker<unknown[], unknown> {
  let cb = breakers.get(name);
  if (!cb) {
    cb = makeBreaker(name);
    breakers.set(name, cb);
  }
  return cb;
}

/** Run fn through the named breaker. Throws on open or timeout. */
export async function withBreaker<T>(name: BreakerName, fn: () => Promise<T>): Promise<T> {
  const cb = getBreaker(name);
  return (await cb.fire(fn)) as T;
}

/** Bulkhead: cap concurrency for a named external. Claude CLI = 1, Gemini = 4. */
const bulkheads = new Map<BreakerName, ReturnType<typeof pLimit>>();
export function withBulkhead<T>(name: BreakerName, size: number, fn: () => Promise<T>): Promise<T> {
  let limit = bulkheads.get(name);
  if (!limit) {
    limit = pLimit(size);
    bulkheads.set(name, limit);
  }
  return limit(fn);
}

export function getBreakerState(name: BreakerName): BreakerState {
  const cb = getBreaker(name);
  const stats = cb.stats;
  const state: BreakerState['state'] = cb.opened ? 'open' : cb.halfOpen ? 'halfOpen' : 'closed';
  return {
    name,
    state,
    failures: stats.failures,
    successes: stats.successes,
    lastFailureAt: lastFailureAt.get(name) ?? null,
  };
}

/** Test-only: wipe breakers + bulkheads between scenarios. */
export function _resetFailureBoundaries(): void {
  for (const cb of breakers.values()) cb.shutdown();
  breakers.clear();
  bulkheads.clear();
  lastFailureAt.clear();
  consecutiveFails.clear();
}
