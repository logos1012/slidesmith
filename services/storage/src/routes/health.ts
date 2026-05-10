// health.ts — GET /health (SPEC §5-1).
// Reports uptime + airtable + s3 + cache state. Always 200 (status only changes
// to 'degraded' when downstream is unavailable, never 5xx — health must answer).
import { Hono } from 'hono';
import { airtableState } from '../lib/airtable-client.js';
import { probeBucket } from '../lib/s3-client.js';
import { getCacheStats } from '../lib/airtable-cache.js';
import { airtableBulkheadStats, s3BulkheadStats } from '../lib/failure-boundary.js';

const startedAt = Date.now();

export const health = new Hono();

health.get('/', async (c) => {
  const at = airtableState();
  const s3 = await probeBucket().catch(() => ({
    available: false,
    bucketAccessible: false,
    lastCheckAt: null,
    region: '',
    bucket: '',
  }));
  const status = at.available && s3.bucketAccessible ? 'ok' : 'degraded';
  return c.json({
    status,
    service: 'slidesmith-storage',
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    airtable: {
      available: at.available,
      throttled: at.throttled,
      lastSuccessAt: at.lastSuccessAt,
      bulkhead: airtableBulkheadStats(),
    },
    s3: {
      available: s3.available,
      bucketAccessible: s3.bucketAccessible,
      lastCheckAt: s3.lastCheckAt,
      bulkhead: s3BulkheadStats(),
    },
    cache: getCacheStats(),
  });
});
