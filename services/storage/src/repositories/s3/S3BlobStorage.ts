// S3BlobStorage.ts — AWS S3 adapter for IBlobStorage.
// All vendor calls go through lib/s3-client (Bulkhead 8 + opossum CB). The
// HTTP layer never imports this file directly; it depends on IBlobStorage.
import type { IBlobStorage, UploadInput } from '../interfaces/IBlobStorage.js';
import type { BlobUploadResult, BlobSignedUrl } from '../../types/domain.js';
import { uploadObject, signGet, deleteObject } from '../../lib/s3-client.js';

const DEFAULT_TTL_SECONDS = 300; // 5 min — SPEC §5-6 (mobile handoff QR window)

export class S3BlobStorage implements IBlobStorage {
  async upload(input: UploadInput): Promise<BlobUploadResult> {
    const res = await uploadObject(input.key, input.body, input.contentType);
    return {
      key: input.key,
      url: res.url,
      etag: res.etag,
      expiresAt: new Date(Date.now() + DEFAULT_TTL_SECONDS * 1000).toISOString(),
    };
  }

  async signRead(key: string, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<BlobSignedUrl> {
    const url = await signGet(key, ttlSeconds);
    return {
      url,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      ttlSeconds,
    };
  }

  async delete(key: string): Promise<boolean> {
    try {
      await deleteObject(key);
      return true;
    } catch (err) {
      // S3 DeleteObject is idempotent server-side, but the SDK still throws on
      // some 404 paths (e.g. bucket missing). Map the documented "no such key"
      // shapes to false so the route stays idempotent.
      const code = (err as { Code?: string; name?: string } | undefined);
      const tag = code?.Code ?? code?.name ?? '';
      if (tag === 'NoSuchKey' || tag === 'NotFound' || tag === 'NoSuchBucket') return false;
      throw err;
    }
  }
}
