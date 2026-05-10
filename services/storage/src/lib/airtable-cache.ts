// airtable-cache.ts — LRU cache for read paths (SPEC §7).
// 5-min TTL, max 500 entries. Single shared instance with simple metrics.
import { LRUCache } from 'lru-cache';
import { loadEnv } from './env.js';

const env = loadEnv();

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

let hits = 0;
let misses = 0;

// lru-cache v11 requires V extends {}; use object as the floor type and cast at boundaries.
export const airtableCache = new LRUCache<string, object>({
  max: env.AIRTABLE_CACHE_MAX,
  ttl: env.AIRTABLE_CACHE_TTL_MS,
});

export function cacheGet<T>(key: string): T | undefined {
  const value = airtableCache.get(key);
  if (value === undefined) {
    misses += 1;
    return undefined;
  }
  hits += 1;
  return value as T;
}

export function cacheSet<T>(key: string, value: T): void {
  // lru-cache requires V extends {}; we accept any T and store as object.
  airtableCache.set(key, value as unknown as object);
}

export function getCacheStats(): CacheStats {
  const total = hits + misses;
  return {
    hits,
    misses,
    size: airtableCache.size,
    hitRate: total === 0 ? 0 : Number((hits / total).toFixed(3)),
  };
}

/** Test-only reset. */
export function _resetCacheStats(): void {
  hits = 0;
  misses = 0;
  airtableCache.clear();
}
