// s3-client.test.ts — exercise the S3 client wrapper (CB + presigner + probe).
// AWS SDK clients are mocked at the module boundary so the test never opens a
// socket. The goal is line coverage of upload/sign/delete/probe + breaker reset.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

let nextSendThrows: Error | null = null;

vi.mock('@aws-sdk/client-s3', async (orig) => {
  const real = (await orig()) as typeof import('@aws-sdk/client-s3');
  return {
    ...real,
    S3Client: class MockS3 {
      async send(): Promise<{ ETag: string }> {
        if (nextSendThrows) throw nextSendThrows;
        return { ETag: '"deadbeef"' };
      }
    },
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async (_client: unknown, _cmd: unknown, opts?: { expiresIn?: number }) => {
    return `https://signed.test.local/sign?exp=${opts?.expiresIn ?? 300}`;
  }),
}));

const s3 = await import('../../src/lib/s3-client.js');

beforeEach(() => {
  nextSendThrows = null;
  s3._resetS3Probe();
});

afterEach(() => vi.clearAllMocks());

describe('uploadObject', () => {
  it('returns the etag and a 5-min default signed url', async () => {
    const out = await s3.uploadObject('k', Buffer.from('x'), 'image/png');
    expect(out.etag).toBe('"deadbeef"');
    expect(out.url).toContain('exp=300');
  });

  it('propagates send errors', async () => {
    nextSendThrows = Object.assign(new Error('S3 down'), { name: 'NetworkingError' });
    await expect(s3.uploadObject('k', Buffer.from('x'), 'image/png')).rejects.toThrow();
  });
});

describe('signGet', () => {
  it('uses the requested expiry seconds', async () => {
    const url = await s3.signGet('k', 900);
    expect(url).toContain('exp=900');
  });
});

describe('deleteObject', () => {
  it('completes without throwing on success', async () => {
    await expect(s3.deleteObject('k')).resolves.toBeUndefined();
  });

  it('propagates upstream errors', async () => {
    nextSendThrows = new Error('forbidden');
    await expect(s3.deleteObject('k')).rejects.toThrow('forbidden');
  });
});

describe('probeBucket', () => {
  it('returns available=true bucketAccessible=true on success', async () => {
    const out = await s3.probeBucket();
    expect(out.available).toBe(true);
    expect(out.bucketAccessible).toBe(true);
    expect(out.bucket).toBeDefined();
  });

  it('caches the result for ~30s (second call is cheap)', async () => {
    const a = await s3.probeBucket();
    const b = await s3.probeBucket();
    expect(b.lastCheckAt).toBe(a.lastCheckAt);
  });

  it('reports bucketAccessible=false when HEAD throws', async () => {
    nextSendThrows = new Error('NoSuchBucket');
    const out = await s3.probeBucket();
    expect(out.bucketAccessible).toBe(false);
  });
});

describe('s3BreakerState', () => {
  it('starts closed (open=false)', () => {
    expect(s3.s3BreakerState().open).toBe(false);
  });
});
