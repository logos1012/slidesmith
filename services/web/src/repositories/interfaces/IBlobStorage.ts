// IBlobStorage — S3 (web → storage `/blob/upload`, `/blob/url/:key`, `/blob/:key` DELETE)
export interface BlobUploadInput {
  key: string;
  contentType: string;
  data: ArrayBuffer | Uint8Array | Blob;
  idempotencyKey: string;
}

export interface BlobUploadResult {
  key: string;
  url: string;
  // v1.0.1: optional metadata — storage v1 returns etag+expiresAt; legacy stubs
  // returned size. Saga only consumes `key`; the extras are kept for diagnostics.
  size?: number;
  etag?: string;
  expiresAt?: string;
  alreadyExists?: boolean;
}

export interface IBlobStorage {
  upload(input: BlobUploadInput): Promise<BlobUploadResult>;
  presignedUrl(key: string, expiresSec?: number): Promise<string>;
  /** 보상 트랜잭션 (Saga rollback). */
  delete(key: string): Promise<void>;
}
