import { describe, it, expect, beforeEach } from 'vitest';
import { FetchServiceClient } from '@/repositories/http/FetchServiceClient';

beforeEach(() => {
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    if (init?.method === 'POST') return new Response(JSON.stringify({ echoed: JSON.parse(String(init.body)) }), { status: 200 });
    if (String(url).endsWith('/err')) return new Response('nope', { status: 500 });
    return new Response(JSON.stringify({ ok: true, url }), { status: 200 });
  }) as typeof fetch;
});

describe('FetchServiceClient', () => {
  it('getJson returns parsed body', async () => {
    const c = new FetchServiceClient('http://x');
    const r = await c.getJson<{ ok: boolean }>('/ok');
    expect(r.ok).toBe(true);
  });

  it('getJson throws on non-2xx', async () => {
    const c = new FetchServiceClient('http://x');
    await expect(c.getJson('/err')).rejects.toThrow();
  });

  it('postJson serializes body and sends content-type', async () => {
    const c = new FetchServiceClient('http://x');
    const r = await c.postJson<{ echoed: { a: number } }>('/post', { a: 1 });
    expect(r.echoed.a).toBe(1);
  });

  it('correlationId header is forwarded', async () => {
    let captured = '';
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      captured = (init.headers as Headers).get('x-correlation-id') ?? '';
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    const c = new FetchServiceClient('http://x');
    await c.getJson('/p', { correlationId: 'CID-1' });
    expect(captured).toBe('CID-1');
  });
});
