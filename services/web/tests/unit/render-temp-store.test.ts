// render-temp-store.test.ts — v1.0.1 fix.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  storeRender, getPng, getZip, _clearForTest,
} from '@/lib/render-temp-store';

describe('render-temp-store', () => {
  beforeEach(() => { _clearForTest(); });
  afterEach(() => { vi.useRealTimers(); _clearForTest(); });

  it('stores PNGs and ZIP, returns them by token', () => {
    const pngs = [Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6])];
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const token = storeRender(pngs, zip);
    expect(token).toMatch(/^[\w-]+$/);
    expect(getPng(token, 0)?.equals(Buffer.from([1, 2, 3]))).toBe(true);
    expect(getPng(token, 1)?.equals(Buffer.from([4, 5, 6]))).toBe(true);
    expect(getPng(token, 99)).toBeNull();
    expect(getZip(token)?.equals(zip)).toBe(true);
  });

  it('returns null for unknown token', () => {
    expect(getPng('bogus', 0)).toBeNull();
    expect(getZip('bogus')).toBeNull();
  });

  it('expires entries after TTL (5 min)', () => {
    vi.useFakeTimers();
    const start = new Date('2026-05-10T00:00:00Z').getTime();
    vi.setSystemTime(start);
    const token = storeRender([Buffer.from([1])], Buffer.from([2]));
    expect(getPng(token, 0)).not.toBeNull();
    vi.setSystemTime(start + 5 * 60 * 1000 + 1);
    expect(getPng(token, 0)).toBeNull();
    expect(getZip(token)).toBeNull();
  });
});
