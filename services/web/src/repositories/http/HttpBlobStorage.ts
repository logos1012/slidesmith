// HttpBlobStorage — web → storage `/blob/*`
// Cycle 2 Fix (F3, 🟠-4): upstream JSON 응답 Zod parse (multipart upload는 raw fetch).
import type { IBlobStorage, BlobUploadInput, BlobUploadResult } from '@/repositories/interfaces/IBlobStorage';
import type { IServiceClient } from '@/repositories/interfaces/IServiceClient';
import { z } from 'zod';

// v1.0.1: storage replies with { key, url, etag, expiresAt }; BFF only reads `key`
// downstream (Saga side-effect ledger). Size + etag + expiresAt all optional so
// either the legacy ('size') or storage v1 ('etag','expiresAt') response shape
// passes — and the Saga keeps moving regardless of which storage is on the other end.
const BlobUploadResultSchema = z.object({
  key: z.string(),
  url: z.string(),
  size: z.number().optional(),
  etag: z.string().optional(),
  expiresAt: z.string().optional(),
  alreadyExists: z.boolean().optional(),
});
const PresignedUrlSchema = z.object({ url: z.string() });

export class HttpBlobStorage implements IBlobStorage {
  constructor(private readonly client: IServiceClient) {}

  async upload(input: BlobUploadInput): Promise<BlobUploadResult> {
    const form = new FormData();
    const blob =
      input.data instanceof Blob ? input.data : new Blob([input.data as ArrayBuffer], { type: input.contentType });
    form.set('file', blob, input.key);
    form.set('key', input.key);
    // v1.0.1: storage validateMultipartFields() requires `contentType` field
    // (not just the Blob's MIME). Without this, /blob/upload returns 400.
    form.set('contentType', input.contentType);
    const res = await this.client.fetch('/blob/upload', {
      method: 'POST',
      body: form,
      headers: { 'idempotency-key': input.idempotencyKey },
    });
    if (!res.ok) throw new Error(`upload ${input.key} → ${res.status}`);
    const raw = await res.json();
    const parsed = BlobUploadResultSchema.safeParse(raw);
    if (!parsed.success) throw new Error(`upload ${input.key} upstream schema mismatch`);
    return parsed.data as BlobUploadResult;
  }

  async presignedUrl(key: string, expiresSec = 300): Promise<string> {
    const json = await this.client.getJson(
      `/blob/url/${encodeURIComponent(key)}?expires=${expiresSec}`,
      undefined,
      PresignedUrlSchema,
    );
    return json.url;
  }

  async delete(key: string): Promise<void> {
    const res = await this.client.fetch(`/blob/${encodeURIComponent(key)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`delete ${key} → ${res.status}`);
  }
}
