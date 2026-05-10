// idempotency.ts — 24h LRU memory cache (SPEC §9).
// Stateless storage: cache loss on restart is acceptable; web BFF Saga is the
// authoritative ledger via sqlite. Used by POST /blob/upload and POST /carousels.
//
// Cycle 2 Fix F2 (Review §H2) — `acquireOrCreate()` collapses the previous
// check-then-remember sequence into a single atomic step. Concurrent POSTs
// with the same Idempotency-Key now share one in-flight Promise instead of
// each running their own create() in parallel and producing duplicate records.
import { LRUCache } from 'lru-cache';
import { loadEnv } from './env.js';

const env = loadEnv();

export interface IdempotencyHit<T> {
  alreadyExists: true;
  value: T;
}

export interface IdempotencyMiss {
  alreadyExists: false;
}

export type IdempotencyResult<T> = IdempotencyHit<T> | IdempotencyMiss;

// lru-cache v11 requires V extends {}; values are cast at the boundary.
const store = new LRUCache<string, object>({
  max: 5_000,
  ttl: env.IDEMPOTENCY_TTL_MS,
});

// In-flight Promise registry — bridges the gap between check-miss and remember,
// the window where the original race lived. Cleared after settle (success or
// failure) so memory stays bounded; the LRU then owns the long-lived hit.
const inflight = new Map<string, Promise<unknown>>();

function compositeKey(scope: string, key: string): string {
  return `${scope}:${key}`;
}

export function checkIdempotency<T>(scope: string, key: string): IdempotencyResult<T> {
  const found = store.get(compositeKey(scope, key));
  if (found === undefined) return { alreadyExists: false };
  return { alreadyExists: true, value: found as T };
}

export function rememberIdempotency<T>(scope: string, key: string, value: T): void {
  store.set(compositeKey(scope, key), value as unknown as object);
}

export interface AcquireResult<T> {
  /** True when the value was returned from cache or a concurrent in-flight call. */
  alreadyExists: boolean;
  value: T;
}

/**
 * Atomic idempotent acquire — the single happy path for POST endpoints.
 *
 * 1. LRU hit → return cached value (`alreadyExists: true`).
 * 2. In-flight hit (a sibling request is currently running `factory()` for
 *    this exact composite key) → await the same Promise and report
 *    `alreadyExists: true`. We do NOT call `factory()` ourselves. This is
 *    what closes the Review §H2 race.
 * 3. Otherwise: register our own Promise in `inflight`, run `factory()`, on
 *    success cache the value and report `alreadyExists: false`, on failure
 *    propagate the error and clear the in-flight entry so a retry can run.
 */
export async function acquireOrCreate<T>(
  scope: string,
  key: string,
  factory: () => Promise<T>,
): Promise<AcquireResult<T>> {
  const ck = compositeKey(scope, key);

  // 1. Cached value — already-persisted result.
  const cached = store.get(ck);
  if (cached !== undefined) return { alreadyExists: true, value: cached as T };

  // 2. Pending sibling — share its Promise instead of starting a duplicate.
  const pending = inflight.get(ck);
  if (pending) {
    const v = (await pending) as T;
    return { alreadyExists: true, value: v };
  }

  // 3. We are first — own the in-flight slot, then settle.
  const p = factory().then(
    (v) => {
      store.set(ck, v as unknown as object);
      inflight.delete(ck);
      return v;
    },
    (err) => {
      // Failure: drop the in-flight entry so a retry can run cleanly.
      inflight.delete(ck);
      throw err;
    },
  );
  inflight.set(ck, p as Promise<unknown>);
  const value = await p;
  return { alreadyExists: false, value };
}

export function _resetIdempotency(): void {
  store.clear();
  inflight.clear();
}
