// lib/render-temp-store.ts — v1.0.1 contract gap fix
// In-process temp store for ZIP-extracted PNG buffers. The render service returns
// ZIP binary; the Saga's upload-blob step expects URLs (its uploadOne() does
// `fetch(url).then(r=>r.arrayBuffer())`). We park the PNGs in-memory and hand
// out same-process URLs — no S3 round-trip, no disk I/O, no secret leak.
//
// TTL: 5 minutes. Saga immediately consumes (~seconds), so 5min is generous.
// Best-effort sweep on every store(): bounded growth without a timer.
import { randomUUID } from 'crypto';

interface Entry {
  pngs: Buffer[];
  zip: Buffer;
  expiresAt: number;
}

const STORE = new Map<string, Entry>();
const TTL_MS = 5 * 60 * 1000;

function sweep(now: number): void {
  for (const [k, v] of STORE) {
    if (v.expiresAt < now) STORE.delete(k);
  }
}

export function storeRender(pngs: Buffer[], zip: Buffer): string {
  const now = Date.now();
  sweep(now);
  const token = randomUUID();
  STORE.set(token, { pngs, zip, expiresAt: now + TTL_MS });
  return token;
}

export function getPng(token: string, idx: number): Buffer | null {
  const e = STORE.get(token);
  if (!e || e.expiresAt < Date.now()) return null;
  return e.pngs[idx] ?? null;
}

export function getZip(token: string): Buffer | null {
  const e = STORE.get(token);
  if (!e || e.expiresAt < Date.now()) return null;
  return e.zip;
}

/** Test-only: drop everything. Production callers should never need this. */
export function _clearForTest(): void {
  STORE.clear();
}
