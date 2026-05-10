// airtable-client.test.ts — opossum CB transitions + cache + bulkhead.
// SPEC §7 (timeout 10s, 50% threshold, 30s reset). Cycle 1 fix: Review §12 권고.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Force env defaults BEFORE module imports (loadEnv() caches at module load).
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

const { airtableFetch, airtableState, AirtableError, _resetBreaker } = await import(
  '../../src/lib/airtable-client.js'
);
const { _resetCacheStats } = await import('../../src/lib/airtable-cache.js');

interface FetchMock {
  calls: number;
  impl: () => Promise<Response>;
}

function makeOk(body: unknown = { ok: true }): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function make5xx(): Response {
  return new Response('boom', { status: 500 });
}

// The breaker wraps the *raw fetch*, not the airtableFetch error mapping —
// 5xx responses are still resolved Promises from fetch's POV. To trip the CB
// we make fetch reject (network-level failure: ECONNRESET, DNS, timeout).
function makeNetworkError(): never {
  throw new Error('ECONNRESET — simulated network failure');
}

function installFetchMock(impl: () => Promise<Response>): FetchMock {
  const m: FetchMock = { calls: 0, impl };
  vi.stubGlobal('fetch', async () => {
    m.calls += 1;
    return m.impl();
  });
  return m;
}

beforeEach(() => {
  _resetBreaker();
  _resetCacheStats();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('airtableFetch — cache', () => {
  it('serves the second GET from cache (1 fetch for 2 calls)', async () => {
    const m = installFetchMock(async () => makeOk({ items: [] }));
    await airtableFetch('/Knowledge?view=Grid');
    await airtableFetch('/Knowledge?view=Grid');
    expect(m.calls).toBe(1);
  });

  it('does not cache POST', async () => {
    const m = installFetchMock(async () => makeOk({ id: 'rec1' }));
    await airtableFetch('/Knowledge', { method: 'POST', body: '{}' });
    await airtableFetch('/Knowledge', { method: 'POST', body: '{}' });
    expect(m.calls).toBe(2);
  });
});

describe('airtableFetch — error mapping', () => {
  it('throws AirtableError on non-2xx with status + body', async () => {
    installFetchMock(async () => make5xx());
    await expect(airtableFetch('/Knowledge')).rejects.toBeInstanceOf(AirtableError);
  });
});

describe('Circuit breaker transitions', () => {
  it('opens after sustained network failures and fast-fails subsequent calls', async () => {
    const m = installFetchMock(async () => makeNetworkError());
    // Drive enough failures past errorThresholdPercentage 50% even when prior
    // tests left successes in the rolling window. 20 reqs × 100% fail >> 50%.
    for (let i = 0; i < 20; i += 1) {
      await airtableFetch(`/fail/${i}`).catch(() => {});
    }
    expect(airtableState().open).toBe(true);
    expect(airtableState().available).toBe(false);

    const before = m.calls;
    // While open, breaker rejects without invoking the wrapped fetch.
    await airtableFetch('/fail/blocked').catch(() => {});
    expect(m.calls).toBe(before);
  });

  it('available flips back to true after _resetBreaker (close)', async () => {
    installFetchMock(async () => makeNetworkError());
    for (let i = 0; i < 20; i += 1) {
      await airtableFetch(`/fail2/${i}`).catch(() => {});
    }
    expect(airtableState().open).toBe(true);
    _resetBreaker();
    expect(airtableState().open).toBe(false);
    expect(airtableState().available).toBe(true);
  });

  // Cycle 2 Fix F8 (Review §L3): HTTP 429 / 5xx now count as breaker failures
  // — Airtable rate limits are the most common production failure mode.
  it('opens on sustained HTTP 429 (Airtable rate limit)', async () => {
    installFetchMock(async () => new Response('rate', { status: 429 }));
    for (let i = 0; i < 20; i += 1) {
      await airtableFetch(`/throttle/${i}`).catch(() => {});
    }
    expect(airtableState().open).toBe(true);
  });

  it('opens on sustained HTTP 503 (Airtable upstream)', async () => {
    installFetchMock(async () => new Response('down', { status: 503 }));
    for (let i = 0; i < 20; i += 1) {
      await airtableFetch(`/down/${i}`).catch(() => {});
    }
    expect(airtableState().open).toBe(true);
  });

  it('does NOT open on plain 404 (caller-controlled, e.g. unknown record id)', async () => {
    installFetchMock(async () => new Response('nope', { status: 404 }));
    for (let i = 0; i < 20; i += 1) {
      await airtableFetch(`/missing/${i}`).catch(() => {});
    }
    // 404 stays a logical "not found" — the breaker should remain closed so
    // typical user typos do not knock the whole adapter offline.
    expect(airtableState().open).toBe(false);
  });
});
