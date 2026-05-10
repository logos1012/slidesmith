// s3-blob.test.ts — IBlobStorage adapter against mocked s3-client helpers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

const uploadCalls: Array<{ key: string; body: Buffer; contentType: string }> = [];
const signCalls: Array<{ key: string; ttl: number }> = [];
const deleteCalls: Array<string> = [];
let nextDeleteThrows: Error | null = null;

vi.mock('../../src/lib/s3-client.js', () => ({
  uploadObject: vi.fn(async (key: string, body: Buffer, contentType: string) => {
    uploadCalls.push({ key, body, contentType });
    return { etag: '"abcd"', url: `https://signed.test/${key}?exp=300` };
  }),
  signGet: vi.fn(async (key: string, ttl: number) => {
    signCalls.push({ key, ttl });
    return `https://signed.test/${key}?exp=${ttl}`;
  }),
  deleteObject: vi.fn(async (key: string) => {
    deleteCalls.push(key);
    if (nextDeleteThrows) throw nextDeleteThrows;
  }),
}));

const { S3BlobStorage } = await import('../../src/repositories/s3/S3BlobStorage.js');

beforeEach(() => {
  uploadCalls.length = 0;
  signCalls.length = 0;
  deleteCalls.length = 0;
  nextDeleteThrows = null;
});

afterEach(() => vi.clearAllMocks());

describe('S3BlobStorage.upload', () => {
  it('forwards the key + body + contentType and returns 5-min expiresAt', async () => {
    const sut = new S3BlobStorage();
    const before = Date.now();
    const out = await sut.upload({
      key: 'k1',
      body: Buffer.from('x'),
      contentType: 'image/png',
    });
    expect(uploadCalls).toEqual([
      { key: 'k1', body: Buffer.from('x'), contentType: 'image/png' },
    ]);
    expect(out.etag).toBe('"abcd"');
    expect(out.url).toContain('https://');
    const expMs = Date.parse(out.expiresAt);
    expect(expMs - before).toBeGreaterThan(290_000);
    expect(expMs - before).toBeLessThan(310_000);
  });
});

describe('S3BlobStorage.signRead', () => {
  it('default ttl is 300 seconds', async () => {
    const sut = new S3BlobStorage();
    const out = await sut.signRead('k1');
    expect(signCalls[0]?.ttl).toBe(300);
    expect(out.ttlSeconds).toBe(300);
  });

  it('custom ttl is forwarded to signGet', async () => {
    const sut = new S3BlobStorage();
    const out = await sut.signRead('k1', 1800);
    expect(signCalls[0]?.ttl).toBe(1800);
    expect(out.ttlSeconds).toBe(1800);
  });
});

describe('S3BlobStorage.delete', () => {
  it('returns true on success', async () => {
    const sut = new S3BlobStorage();
    expect(await sut.delete('k1')).toBe(true);
    expect(deleteCalls).toEqual(['k1']);
  });

  it('returns false on NoSuchKey (idempotent)', async () => {
    const sut = new S3BlobStorage();
    nextDeleteThrows = Object.assign(new Error('boom'), { name: 'NoSuchKey' });
    expect(await sut.delete('k1')).toBe(false);
  });

  it('rethrows unknown errors', async () => {
    const sut = new S3BlobStorage();
    nextDeleteThrows = new Error('network');
    await expect(sut.delete('k1')).rejects.toThrow('network');
  });
});
