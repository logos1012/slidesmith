// blob.ts — /blob endpoints (SPEC §5-6).
// Supports two upload modes (web BFF picks per situation):
//   1. Server-side: POST /blob/upload with { key, contentType, base64 } —
//      service streams to S3 and returns the etag + 5-min signed URL.
//   2. Multipart: POST /blob/upload with `multipart/form-data` (file + key
//      + contentType + idempotencyKey).
// GET /blob/url/:key returns a fresh 5-min presigned read URL (mobile QR).
// DELETE /blob/:key is the Saga compensating step (idempotent — 404 → 204).
//
// Cycle 2 Fix F1 (Review §H1) — contentType whitelist + key path-safe regex
// + ContentDisposition: 'attachment' close the XSS / drive-by file vector.
import { Hono } from 'hono';
import { z } from 'zod';
import { getRepos } from '../repositories/container.js';
import { acquireOrCreate } from '../lib/idempotency.js';
import { logger } from '../lib/logger.js';
import type { BlobUploadResult } from '../types/domain.js';

export const blob = new Hono();

const DEFAULT_TTL = 300;
const MAX_TTL = 3600;

// SPEC §5-6 `<png|pdf|jpg>` — broaden to the documented v1.0 surface:
// PNG / JPEG / WEBP for carousel slide rasters + PDF for handoff exports.
// Anything outside this set (text/html, application/x-msdownload, …) becomes
// a drive-by file or XSS vector once the signed URL is shared. Reject at the
// boundary, never let the bytes reach S3.
const ALLOWED_CT = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
]);

// Path-safe key: word chars + `- . / _` only. Anchored regex blocks all
// whitespace / shell metacharacter; the explicit traversal check below
// rejects `..` segments since they are otherwise allowed by the char class
// (the dot is needed for legitimate `slide.png` keys).
const KEY_RE = /^[\w\-./]+$/;
function isPathSafe(k: string): boolean {
  if (!KEY_RE.test(k)) return false;
  // Reject `..` as a full segment (`../foo`, `foo/../bar`, `foo/..`, just `..`).
  for (const seg of k.split('/')) {
    if (seg === '..') return false;
  }
  return true;
}

// ~20 MB base64 → ~15 MB raw. Hono request body cap is set in `server.ts`,
// but enforce a pre-decode limit here too so a 1 GB base64 string never even
// allocates the decoded Buffer (Memory limit 256 MB → OOM otherwise).
const MAX_BASE64_LEN = 20 * 1024 * 1024;

const JsonUploadBody = z.object({
  key: z
    .string()
    .min(1)
    .max(1024)
    .refine(isPathSafe, 'key must be path-safe (no `..`, no whitespace, no shell metachars)'),
  contentType: z
    .string()
    .refine((v) => ALLOWED_CT.has(v), 'unsupported content type'),
  // base64-encoded body (kept under ~10 MB by web BFF). Optional so the client
  // can also POST without a body to get a presigned PUT URL (Cycle 3 expansion).
  base64: z.string().max(MAX_BASE64_LEN, 'body too large').optional(),
  idempotencyKey: z.string().min(1).max(200).optional(),
});

const SignedUrlQuery = z.object({
  expires: z.coerce.number().int().min(60).max(MAX_TTL).default(DEFAULT_TTL),
});

function validateMultipartFields(
  k: unknown,
  ct: unknown,
): { ok: true; key: string; contentType: string } | { ok: false; message: string } {
  if (typeof k !== 'string' || k.length === 0 || k.length > 1024) {
    return { ok: false, message: 'key required (1-1024 chars)' };
  }
  if (!isPathSafe(k)) {
    return { ok: false, message: 'key must be path-safe (no `..`, no whitespace, no shell metachars)' };
  }
  if (typeof ct !== 'string' || !ALLOWED_CT.has(ct)) {
    return { ok: false, message: 'unsupported content type' };
  }
  return { ok: true, key: k, contentType: ct };
}

blob.post('/upload', async (c) => {
  const ctype = c.req.header('content-type') ?? '';
  let key: string;
  let contentType: string;
  let body: Buffer | null = null;
  let idemKey: string | undefined;

  if (ctype.startsWith('multipart/form-data')) {
    const form = await c.req.formData();
    const fileField = form.get('file');
    const k = form.get('key');
    const ct = form.get('contentType');
    const ik = form.get('idempotencyKey');
    const v = validateMultipartFields(k, ct);
    if (!v.ok) {
      return c.json({ error: 'invalid_form', message: v.message }, 400);
    }
    key = v.key;
    contentType = v.contentType;
    if (typeof ik === 'string') idemKey = ik;
    if (fileField instanceof File) {
      const ab = await fileField.arrayBuffer();
      body = Buffer.from(ab);
    }
  } else {
    const json = await c.req.json().catch(() => null);
    const parsed = JsonUploadBody.safeParse(json);
    if (!parsed.success) {
      return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
    }
    key = parsed.data.key;
    contentType = parsed.data.contentType;
    if (parsed.data.base64) body = Buffer.from(parsed.data.base64, 'base64');
    if (parsed.data.idempotencyKey) idemKey = parsed.data.idempotencyKey;
  }

  // Idempotency: header (preferred) or body/form field. Both web BFF Saga
  // retries and ad-hoc CLI calls land in the same scope.
  idemKey = c.req.header('Idempotency-Key') ?? c.req.header('idempotency-key') ?? idemKey;

  // No body → presigned PUT URL pattern is reserved for Cycle 3. For now
  // 400 with a clear message so callers don't silently produce empty objects.
  if (!body || body.length === 0) {
    return c.json({ error: 'missing_body', message: 'provide base64 or multipart file' }, 400);
  }

  // Idempotency + create wrapped in a single atomic acquireOrCreate (Cycle 2
  // Fix F2 / Review §H2) — concurrent POSTs with the same key share one
  // in-flight Promise so we never PutObject twice.
  const factory = (): Promise<BlobUploadResult> =>
    getRepos().blob.upload({ key, body: body as Buffer, contentType });

  try {
    if (idemKey) {
      const hit = await acquireOrCreate<BlobUploadResult>('blob', idemKey, factory);
      const status = hit.alreadyExists ? 200 : 201;
      return c.json(hit.alreadyExists ? { ...hit.value, alreadyExists: true } : hit.value, status);
    }
    const out = await factory();
    return c.json(out, 201);
  } catch (err) {
    // Logger keeps raw message; client gets a vendor-neutral message
    // (SPEC §6 — never echo "AWS" / "S3" / "Airtable" through the boundary).
    logger.error({ err: (err as Error).message, key }, 'blob_upload_failed');
    return c.json({ error: 'upload_failed', message: 'object storage rejected upload' }, 502);
  }
});

blob.get('/url/:key{.+}', async (c) => {
  // Hono's :key{.+} captures slashes so callers can pass `carousels/abc/01.png`.
  const parsed = SignedUrlQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );
  if (!parsed.success) {
    return c.json({ error: 'invalid_query', issues: parsed.error.issues }, 400);
  }
  const out = await getRepos().blob.signRead(c.req.param('key'), parsed.data.expires);
  return c.json(out);
});

blob.delete('/:key{.+}', async (c) => {
  // DELETE is the Saga compensating step. Always 204 (SPEC §5-6 — idempotent):
  // missing keys are normal, infra failures are retried by the Saga ledger.
  try {
    const removed = await getRepos().blob.delete(c.req.param('key'));
    if (!removed) logger.info({ key: c.req.param('key') }, 'blob_delete_already_gone');
  } catch (err) {
    logger.warn({ err: (err as Error).message, key: c.req.param('key') }, 'blob_delete_failed');
  }
  return c.body(null, 204);
});
