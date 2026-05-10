// s3-client.ts — AWS SDK v3 client wrapper (SPEC §8).
// Bulkhead 8 + opossum CB (SPEC §10: 5 fail → 1min open, 30s timeout).
import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import CircuitBreaker from 'opossum';
import { loadEnv } from './env.js';
import { s3Limit } from './failure-boundary.js';
import { logger } from './logger.js';

const env = loadEnv();

export const s3 = new S3Client({
  region: env.AWS_S3_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

// CB action: send any S3 command through the bulkhead.
// `s3.send` is generic over each command's input/output pair; opossum types its
// action as a single (T) -> Promise<R> pair, so we erase the per-command shape
// at the boundary and let callers cast the response when they need fields.
async function s3Send(command: unknown): Promise<unknown> {
  return s3Limit(() => s3.send(command as Parameters<typeof s3.send>[0]));
}

// SPEC §10: S3 — 5 fail → 1min open / 30s timeout.
// errorThresholdPercentage 50% + volumeThreshold 5 reproduces "5 fail → open"
// once a small rolling window has accumulated.
const s3Breaker = new CircuitBreaker(s3Send, {
  timeout: 30_000,
  errorThresholdPercentage: 50,
  volumeThreshold: 5,
  resetTimeout: 60_000,
  rollingCountTimeout: 60_000,
  rollingCountBuckets: 6,
  name: 's3',
});

s3Breaker.on('open', () => logger.warn({ breaker: 's3' }, 'circuit_open'));
s3Breaker.on('halfOpen', () => logger.info({ breaker: 's3' }, 'circuit_half_open'));
s3Breaker.on('close', () => logger.info({ breaker: 's3' }, 'circuit_close'));

export interface S3BreakerState {
  open: boolean;
}

export function s3BreakerState(): S3BreakerState {
  return { open: s3Breaker.opened };
}

export interface S3State {
  available: boolean;
  bucketAccessible: boolean;
  lastCheckAt: string | null;
  region: string;
  bucket: string;
}

let lastBucketCheck: { ok: boolean; at: string } | null = null;

/** Probe used by /health. Cached for 30s to avoid hammering S3. */
export async function probeBucket(): Promise<S3State> {
  const now = Date.now();
  if (lastBucketCheck && now - new Date(lastBucketCheck.at).getTime() < 30_000) {
    return {
      available: !s3Breaker.opened,
      bucketAccessible: lastBucketCheck.ok,
      lastCheckAt: lastBucketCheck.at,
      region: env.AWS_S3_REGION,
      bucket: env.AWS_S3_BUCKET,
    };
  }
  try {
    await s3Breaker.fire(new HeadBucketCommand({ Bucket: env.AWS_S3_BUCKET }));
    lastBucketCheck = { ok: true, at: new Date().toISOString() };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 's3_head_bucket_failed');
    lastBucketCheck = { ok: false, at: new Date().toISOString() };
  }
  return {
    available: !s3Breaker.opened,
    bucketAccessible: lastBucketCheck.ok,
    lastCheckAt: lastBucketCheck.at,
    region: env.AWS_S3_REGION,
    bucket: env.AWS_S3_BUCKET,
  };
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<{ etag: string; url: string }> {
  // Cycle 2 Fix F1 (Review §H1): force ContentDisposition: 'attachment' so a
  // browser hitting the signed URL downloads the bytes instead of rendering
  // them. Even with the contentType whitelist this is defence-in-depth — a
  // legitimate `image/png` cannot become a script via header trickery.
  const res = (await s3Breaker.fire(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentDisposition: 'attachment',
    }),
  )) as { ETag?: string };
  const url = await signGet(key, 300);
  return { etag: res.ETag ?? '', url };
}

export async function signGet(key: string, expiresIn = 300): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }),
    { expiresIn },
  );
}

export async function deleteObject(key: string): Promise<void> {
  await s3Breaker.fire(new DeleteObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }));
}

/** Test-only reset of probe cache and CB. */
export function _resetS3Probe(): void {
  lastBucketCheck = null;
  s3Breaker.close();
}
