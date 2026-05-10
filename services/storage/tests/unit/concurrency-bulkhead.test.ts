// concurrency-bulkhead.test.ts — Cycle 2 Fix F5 (Review §M3).
// SPEC §10: Airtable Bulkhead 5 / S3 Bulkhead 8.
// We pin both via env BEFORE loading failure-boundary, then assert that the
// p-limit gate actually serialises beyond the configured concurrency.
import { beforeEach, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.AIRTABLE_BULKHEAD = '5';
process.env.S3_BULKHEAD = '8';

const { _resetEnv } = await import('../../src/lib/env.js');
_resetEnv();

const { airtableLimit, s3Limit, airtableBulkheadStats, s3BulkheadStats } = await import(
  '../../src/lib/failure-boundary.js'
);

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  // p-limit has no public reset, but each test issues fresh tasks so any
  // stale active count converges back to 0 between cases.
});

describe('airtableLimit — Bulkhead 5 (SPEC §10)', () => {
  it('reports concurrency=5', () => {
    const s = airtableBulkheadStats();
    expect(s.concurrency).toBe(5);
  });

  it('runs at most 5 tasks concurrently and queues the rest', async () => {
    const N = 10;
    let active = 0;
    let peak = 0;
    const task = async (): Promise<void> => {
      active += 1;
      peak = Math.max(peak, active);
      await sleep(40);
      active -= 1;
    };
    // Schedule 10 — only 5 should run at once, 5 should pend.
    const ps = Array.from({ length: N }, () => airtableLimit(task));
    // Right after scheduling, give the loop a tick so p-limit has marked the
    // first batch as active and the rest as pending.
    await sleep(5);
    const mid = airtableBulkheadStats();
    expect(mid.active).toBeLessThanOrEqual(5);
    expect(mid.active + mid.pending).toBe(N);

    await Promise.all(ps);
    expect(peak).toBe(5);
  });
});

describe('s3Limit — Bulkhead 8 (SPEC §10)', () => {
  it('reports concurrency=8', () => {
    const s = s3BulkheadStats();
    expect(s.concurrency).toBe(8);
  });

  it('runs at most 8 tasks concurrently', async () => {
    const N = 16;
    let active = 0;
    let peak = 0;
    const task = async (): Promise<void> => {
      active += 1;
      peak = Math.max(peak, active);
      await sleep(40);
      active -= 1;
    };
    const ps = Array.from({ length: N }, () => s3Limit(task));
    await sleep(5);
    const mid = s3BulkheadStats();
    expect(mid.active).toBeLessThanOrEqual(8);
    expect(mid.active + mid.pending).toBe(N);

    await Promise.all(ps);
    expect(peak).toBe(8);
  });
});
