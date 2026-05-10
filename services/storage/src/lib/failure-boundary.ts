// failure-boundary.ts — Bulkhead (p-limit) per external dependency.
// SPEC §10: Airtable 5, S3 8. Used by airtable-client + s3-client.
import pLimit from 'p-limit';
import { loadEnv } from './env.js';

const env = loadEnv();

export const airtableLimit = pLimit(env.AIRTABLE_BULKHEAD);
export const s3Limit = pLimit(env.S3_BULKHEAD);

export interface BulkheadStats {
  active: number;
  pending: number;
  concurrency: number;
}

export function airtableBulkheadStats(): BulkheadStats {
  return {
    active: airtableLimit.activeCount,
    pending: airtableLimit.pendingCount,
    concurrency: env.AIRTABLE_BULKHEAD,
  };
}

export function s3BulkheadStats(): BulkheadStats {
  return {
    active: s3Limit.activeCount,
    pending: s3Limit.pendingCount,
    concurrency: env.S3_BULKHEAD,
  };
}
