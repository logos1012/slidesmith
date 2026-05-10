// tests/failure-boundary.test.ts — opossum CB + p-limit bulkhead behavior.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  withBreaker,
  withBulkhead,
  getBreakerState,
  _resetFailureBoundaries,
} from '../src/lib/failure-boundary.js';

describe('failure-boundary', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    _resetFailureBoundaries();
  });

  it('passes through successful calls and records success', async () => {
    const result = await withBreaker('claude-cli', async () => 42);
    expect(result).toBe(42);
    const state = getBreakerState('claude-cli');
    expect(state.state).toBe('closed');
    expect(state.successes).toBeGreaterThan(0);
  });

  it('opens breaker after 5 consecutive failures (5 of 5 = OPEN)', async () => {
    // Cycle 2 Fix P1-2: errorThresholdPercentage=100 + volumeThreshold=5
    // → exactly "5 of 5 fail" opens the breaker.
    for (let i = 0; i < 5; i++) {
      await withBreaker('anthropic-sdk', async () => {
        throw new Error('boom');
      }).catch(() => undefined);
    }
    const state = getBreakerState('anthropic-sdk');
    expect(['open', 'halfOpen']).toContain(state.state);
    expect(state.failures).toBeGreaterThanOrEqual(5);
  });

  it('keeps breaker CLOSED after 4 fails (volume threshold not met)', async () => {
    for (let i = 0; i < 4; i++) {
      await withBreaker('claude-cli', async () => {
        throw new Error('boom');
      }).catch(() => undefined);
    }
    const state = getBreakerState('claude-cli');
    // Only 4 calls in window — volumeThreshold=5 not reached yet.
    expect(state.state).toBe('closed');
  });

  it('keeps breaker CLOSED when any single success appears in window of 5', async () => {
    // 4 fails + 1 success → 80% failure rate < 100% threshold → still closed.
    for (let i = 0; i < 4; i++) {
      await withBreaker('gemini-python', async () => {
        throw new Error('boom');
      }).catch(() => undefined);
    }
    await withBreaker('gemini-python', async () => 'ok').catch(() => undefined);
    const state = getBreakerState('gemini-python');
    expect(state.state).toBe('closed');
  });

  it('rejects fast when breaker is open', async () => {
    for (let i = 0; i < 5; i++) {
      await withBreaker('gemini-python', async () => {
        throw new Error('boom');
      }).catch(() => undefined);
    }
    const start = Date.now();
    let rejected = false;
    try {
      await withBreaker('gemini-python', async () => 'never');
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
    expect(Date.now() - start).toBeLessThan(200);
  });

  it('bulkhead serializes calls under size 1', async () => {
    const order: string[] = [];
    const a = withBulkhead('claude-cli', 1, async () => {
      order.push('a-start');
      await new Promise((r) => setTimeout(r, 30));
      order.push('a-end');
    });
    const b = withBulkhead('claude-cli', 1, async () => {
      order.push('b-start');
    });
    await Promise.all([a, b]);
    // a must finish before b starts when concurrency = 1.
    expect(order).toEqual(['a-start', 'a-end', 'b-start']);
  });
});
