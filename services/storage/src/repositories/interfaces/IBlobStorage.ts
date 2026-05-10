// IBlobStorage.ts — server-side DIP for object storage (S3 today, swap-ready).
// SPEC §5-6 + ARCH §6-5 vendor encapsulation: never mention S3 in domain types.
import type { BlobUploadResult, BlobSignedUrl } from '../../types/domain.js';

export interface UploadInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface IBlobStorage {
  upload(input: UploadInput): Promise<BlobUploadResult>;
  /** Returns a presigned URL for read access. Default 5-minute TTL (SPEC §5-6). */
  signRead(key: string, ttlSeconds?: number): Promise<BlobSignedUrl>;
  /** Idempotent: 404 from the vendor is mapped to false, not throw. */
  delete(key: string): Promise<boolean>;
}
