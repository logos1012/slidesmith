// airtable-client.ts — fetch wrapper + Circuit breaker + Bulkhead.
// SPEC §7: opossum CB (50% threshold / 30s reset) + p-limit(5) + 5-min lru-cache.
import CircuitBreaker from 'opossum';
import { loadEnv } from './env.js';
import { airtableLimit } from './failure-boundary.js';
import { cacheGet, cacheSet } from './airtable-cache.js';
import { logger } from './logger.js';

const env = loadEnv();

export class AirtableError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Airtable HTTP ${status}`);
    this.name = 'AirtableError';
  }
}

interface FetchArgs {
  url: string;
  init: RequestInit;
}

// Cycle 2 Fix F8 (Review §L3): a `fetch` Promise resolves on HTTP 429 / 5xx,
// so the breaker treated those statuses as "success" and never tripped on
// real-world Airtable rate limits. Convert documented retryable statuses
// (429 + 5xx) to a thrown error inside the breaker action so SPEC §10
// "50% fail → 30s open" actually captures Airtable throttling.
class AirtableUpstreamError extends Error {
  constructor(public readonly status: number) {
    super(`Airtable HTTP ${status}`);
    this.name = 'AirtableUpstreamError';
  }
}

async function rawFetch({ url, init }: FetchArgs): Promise<Response> {
  const res = await airtableLimit(() => fetch(url, init));
  if (res.status === 429 || res.status >= 500) {
    // Throw a fresh error so the breaker counts a failure. The original
    // status/body is preserved on the error object for the outer handler
    // to re-package as `AirtableError` (vendor-neutral up the call chain).
    throw new AirtableUpstreamError(res.status);
  }
  return res;
}

const breaker = new CircuitBreaker(rawFetch, {
  timeout: 10_000,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
  rollingCountTimeout: 60_000,
  rollingCountBuckets: 6,
  name: 'airtable',
});

let lastSuccessAt: string | null = null;

breaker.on('success', () => {
  lastSuccessAt = new Date().toISOString();
});
breaker.on('open', () => logger.warn({ breaker: 'airtable' }, 'circuit_open'));
breaker.on('halfOpen', () => logger.info({ breaker: 'airtable' }, 'circuit_half_open'));
breaker.on('close', () => logger.info({ breaker: 'airtable' }, 'circuit_close'));

export interface AirtableState {
  available: boolean;
  throttled: boolean;
  lastSuccessAt: string | null;
  open: boolean;
}

export function airtableState(): AirtableState {
  return {
    available: !breaker.opened,
    throttled: airtableLimit.pendingCount > 0,
    lastSuccessAt,
    open: breaker.opened,
  };
}

/** Cached GET wrapper. POST/PATCH/DELETE bypass cache. */
export async function airtableFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const cacheKey = `${method}:${path}`;
  if (method === 'GET') {
    const cached = cacheGet<T>(cacheKey);
    if (cached !== undefined) return cached;
  }

  const url = `${env.AIRTABLE_API_BASE}/${env.AIRTABLE_BASE_ID}${path}`;
  const headers = {
    Authorization: `Bearer ${env.AIRTABLE_PAT}`,
    'Content-Type': 'application/json',
    ...(init.headers ?? {}),
  };
  let res: Response;
  try {
    res = (await breaker.fire({ url, init: { ...init, method, headers } })) as Response;
  } catch (err) {
    // Map breaker-thrown 429/5xx (Cycle 2 Fix F8) back to AirtableError so
    // callers see one consistent error class.
    if (err instanceof AirtableUpstreamError) {
      throw new AirtableError(err.status, '');
    }
    throw err;
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AirtableError(res.status, body);
  }
  const data = (await res.json()) as T;
  if (method === 'GET') cacheSet(cacheKey, data);
  return data;
}

/** Test-only escape hatch — closes the breaker so tests start clean. */
export function _resetBreaker(): void {
  breaker.close();
  lastSuccessAt = null;
}
