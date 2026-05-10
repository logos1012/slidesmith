// idempotency.test.ts — scope isolation + TTL expiry (SPEC §9).
// Cycle 1 fix: Review §12 권고 (idempotency unit test).
import { beforeEach, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
// Short TTL for the expiry test path (200ms) — env defaults are 24h.
process.env.IDEMPOTENCY_TTL_MS = '200';

const { _resetEnv } = await import('../../src/lib/env.js');
_resetEnv();

const { checkIdempotency, rememberIdempotency, acquireOrCreate, _resetIdempotency } =
  await import('../../src/lib/idempotency.js');

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  _resetIdempotency();
});

describe('idempotency — basic miss/hit', () => {
  it('returns alreadyExists=false for an unseen key', () => {
    const out = checkIdempotency<{ id: string }>('carousel', 'nope');
    expect(out.alreadyExists).toBe(false);
  });

  it('returns the stored value on a repeated key within the same scope', () => {
    rememberIdempotency('carousel', 'k1', { id: 'rec1' });
    const out = checkIdempotency<{ id: string }>('carousel', 'k1');
    expect(out.alreadyExists).toBe(true);
    if (out.alreadyExists) expect(out.value.id).toBe('rec1');
  });
});

describe('idempotency — scope isolation', () => {
  it('the same key in two scopes does not collide (carousel:k1 vs blob:k1)', () => {
    rememberIdempotency('carousel', 'k1', { id: 'car-1' });
    rememberIdempotency('blob', 'k1', { id: 'blob-1' });
    const c = checkIdempotency<{ id: string }>('carousel', 'k1');
    const b = checkIdempotency<{ id: string }>('blob', 'k1');
    expect(c.alreadyExists && c.value.id).toBe('car-1');
    expect(b.alreadyExists && b.value.id).toBe('blob-1');
  });
});

describe('idempotency — TTL expiry', () => {
  it('forgets the key after the configured TTL elapses', async () => {
    rememberIdempotency('carousel', 'ttl-key', { id: 'rec-x' });
    expect(checkIdempotency('carousel', 'ttl-key').alreadyExists).toBe(true);

    // lru-cache TTL uses perf_hooks.performance.now under the hood, which fake
    // timers do not move. A short real sleep keeps the test deterministic.
    await sleep(300);

    expect(checkIdempotency('carousel', 'ttl-key').alreadyExists).toBe(false);
  });
});

describe('idempotency — acquireOrCreate (Cycle 2 Fix F2 / Review §H2)', () => {
  it('runs factory once on first miss', async () => {
    let calls = 0;
    const out = await acquireOrCreate('carousel', 'first', async () => {
      calls += 1;
      return { id: 'rec-1' };
    });
    expect(calls).toBe(1);
    expect(out.alreadyExists).toBe(false);
    expect(out.value).toEqual({ id: 'rec-1' });
  });

  it('returns the cached value on a repeat call without re-running factory', async () => {
    let calls = 0;
    const f = async (): Promise<{ id: string }> => {
      calls += 1;
      return { id: 'rec-1' };
    };
    await acquireOrCreate('carousel', 'twice', f);
    const second = await acquireOrCreate('carousel', 'twice', f);
    expect(calls).toBe(1);
    expect(second.alreadyExists).toBe(true);
    expect(second.value).toEqual({ id: 'rec-1' });
  });

  it('5 concurrent acquireOrCreate calls share one factory invocation', async () => {
    let calls = 0;
    const start = (): Promise<{ id: string }> =>
      acquireOrCreate('carousel', 'race', async () => {
        calls += 1;
        // Yield so all 5 callers see the in-flight Promise before resolution.
        await sleep(20);
        return { id: 'only-rec' };
      }).then((r) => ({ ...r.value, alreadyExists: r.alreadyExists }));

    const results = await Promise.all([start(), start(), start(), start(), start()]);

    expect(calls).toBe(1);
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    // Exactly one creator (alreadyExists=false), 4 share the in-flight Promise.
    const created = results.filter((r) => !r.alreadyExists).length;
    const shared = results.filter((r) => r.alreadyExists).length;
    expect(created).toBe(1);
    expect(shared).toBe(4);
  });

  it('clears the in-flight slot on factory failure so retries can proceed', async () => {
    let attempts = 0;
    const f = async (): Promise<{ id: string }> => {
      attempts += 1;
      if (attempts === 1) throw new Error('boom');
      return { id: 'rec-on-retry' };
    };
    await expect(acquireOrCreate('carousel', 'retry', f)).rejects.toThrow('boom');
    const ok = await acquireOrCreate('carousel', 'retry', f);
    expect(attempts).toBe(2);
    expect(ok.alreadyExists).toBe(false);
    expect(ok.value).toEqual({ id: 'rec-on-retry' });
  });
});
