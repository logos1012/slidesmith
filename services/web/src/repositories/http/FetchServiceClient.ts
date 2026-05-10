// FetchServiceClient — IServiceClient impl (fetch + timeout + correlation_id)
// Cycle 2: 단순 fetch + abort timeout. Cycle 3에서 opossum/p-limit 박제.
// Cycle 2 Fix (F3, 🟠-4): 옵셔널 schema → 응답 자동 Zod parse (upstream contract guard).
import type { z } from 'zod';
import type { IServiceClient, ServiceFetchInit } from '@/repositories/interfaces/IServiceClient';

export class FetchServiceClient implements IServiceClient {
  constructor(public readonly baseUrl: string, private readonly defaultTimeoutMs = 10_000) {}

  async fetch(path: string, init?: ServiceFetchInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutMs = init?.timeoutMs ?? this.defaultTimeoutMs;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers = new Headers(init?.headers);
    if (init?.correlationId) headers.set('x-correlation-id', init.correlationId);
    try {
      return await fetch(this.baseUrl + path, {
        ...init,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async getJson<T>(path: string, init?: ServiceFetchInit, schema?: z.ZodSchema<T>): Promise<T> {
    const res = await this.fetch(path, { ...init, method: 'GET' });
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    const json = await res.json();
    return parseOrThrow(json, schema, `GET ${path}`);
  }

  async postJson<T>(
    path: string,
    body: unknown,
    init?: ServiceFetchInit,
    schema?: z.ZodSchema<T>,
  ): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const res = await this.fetch(path, {
      ...init,
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
    const json = await res.json();
    return parseOrThrow(json, schema, `POST ${path}`);
  }
}

function parseOrThrow<T>(raw: unknown, schema: z.ZodSchema<T> | undefined, label: string): T {
  if (!schema) return raw as T;
  const r = schema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `${label} upstream schema mismatch: ${r.error.issues.map((i) => i.path.join('.')).join(',')}`,
    );
  }
  return r.data;
}
