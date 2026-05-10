// _setup.ts — shared test bootstrap (env defaults + fake repos + mocked S3 SDK).
import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock S3 SDK so module load (s3-client) never tries to reach the network.
vi.mock('@aws-sdk/client-s3', async (orig) => {
  const real = (await orig()) as typeof import('@aws-sdk/client-s3');
  return {
    ...real,
    S3Client: class MockS3 {
      async send(): Promise<unknown> {
        return {};
      }
    },
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async (_client: unknown, _cmd: unknown, opts?: { expiresIn?: number }) => {
    const exp = opts?.expiresIn ?? 300;
    return `https://signed.test.local/key?exp=${exp}`;
  },
}));
