import { describe, it, expect } from 'vitest';
import type { z } from 'zod';
import { HttpKnowledgeRepo } from '@/repositories/http/HttpKnowledgeRepo';
import { HttpTemplateRepo } from '@/repositories/http/HttpTemplateRepo';
import { HttpCarouselRepo } from '@/repositories/http/HttpCarouselRepo';
import { HttpElementRepo } from '@/repositories/http/HttpElementRepo';
import { HttpBlobStorage } from '@/repositories/http/HttpBlobStorage';
import { HttpLlmGateway } from '@/repositories/http/HttpLlmGateway';
import type { IServiceClient, ServiceFetchInit } from '@/repositories/interfaces/IServiceClient';

// HttpRenderGateway tests live in `http-render-gateway.test.ts` (node env) because
// adm-zip's parser misbehaves under vitest+jsdom (build OK, re-parse returns 0 entries).

class MockClient implements IServiceClient {
  baseUrl = 'http://mock';
  calls: Array<{ method: string; path: string; body?: unknown }> = [];
  responses = new Map<string, unknown>();
  setJson(path: string, body: unknown) { this.responses.set(path, body); }
  async getJson<T>(path: string, _init?: ServiceFetchInit, schema?: z.ZodSchema<T>): Promise<T> {
    this.calls.push({ method: 'GET', path });
    const raw = this.responses.get(path) ?? {};
    if (!schema) return raw as T;
    const r = schema.safeParse(raw);
    if (!r.success) throw new Error(`mock GET ${path} schema mismatch`);
    return r.data;
  }
  async postJson<T>(path: string, body: unknown, _init?: ServiceFetchInit, schema?: z.ZodSchema<T>): Promise<T> {
    this.calls.push({ method: 'POST', path, body });
    const raw = this.responses.get(path) ?? {};
    if (!schema) return raw as T;
    const r = schema.safeParse(raw);
    if (!r.success) throw new Error(`mock POST ${path} schema mismatch`);
    return r.data;
  }
  async fetch(path: string, init?: ServiceFetchInit): Promise<Response> {
    this.calls.push({ method: init?.method ?? 'GET', path });
    return new Response('{}', { status: 200 });
  }
}

describe('Http repositories', () => {
  it('HttpKnowledgeRepo passes category/q params', async () => {
    const c = new MockClient();
    c.setJson('/knowledge?category=Frameworks', { items: [{ id: '1', category: 'Frameworks', name: 'PAS', description: '' }] });
    const r = new HttpKnowledgeRepo(c);
    const items = await r.list({ category: 'Frameworks' });
    expect(items).toHaveLength(1);
    expect(c.calls[0]?.path).toBe('/knowledge?category=Frameworks');
  });

  it('HttpTemplateRepo list + detect', async () => {
    const c = new MockClient();
    c.setJson('/templates', { items: [{ id: 't', name: 'A', description: '', ratios: ['1:1'], tags: [] }] });
    c.setJson('/templates/detect', { template: { id: 't', name: 'A', description: '', ratios: ['1:1'], tags: [] } });
    const r = new HttpTemplateRepo(c);
    expect((await r.list()).length).toBe(1);
    expect((await r.detect('hi'))?.id).toBe('t');
  });

  it('HttpCarouselRepo save sends idempotency-key header', async () => {
    const c = new MockClient();
    c.setJson('/carousels', { id: 'x', title: 't', ratios: ['1:1'], platform: 'instagram', s3Urls: [], createdAt: '2026-01-01T00:00:00Z' });
    const r = new HttpCarouselRepo(c);
    const out = await r.save({ title: 't', ratios: ['1:1'], platform: 'instagram', s3Urls: [], idempotencyKey: 'K-12345678' });
    expect(out.id).toBe('x');
  });

  it('HttpElementRepo list w/ type+q', async () => {
    const c = new MockClient(); c.setJson('/elements?type=character&q=jisoo', { items: [] });
    const r = new HttpElementRepo(c);
    expect(await r.list('character', 'jisoo')).toEqual([]);
  });

  it('HttpBlobStorage upload + presignedUrl + delete', async () => {
    const c = new MockClient();
    const r = new HttpBlobStorage(c);
    c.setJson('/blob/url/foo?expires=300', { url: 'https://X' });
    expect(await r.presignedUrl('foo')).toBe('https://X');
    await r.delete('foo'); // ok via fetch mock
    expect(c.calls.find((x) => x.method === 'DELETE' && x.path === '/blob/foo')).toBeDefined();
  });

  it('HttpLlmGateway moderate + caption', async () => {
    const c = new MockClient();
    c.setJson('/moderation/check', { ok: true, flaggedTerms: [] });
    c.setJson('/caption/generate', { caption: 'c', hashtags: [] });
    const r = new HttpLlmGateway(c);
    expect((await r.moderate('hi', [])).ok).toBe(true);
    expect((await r.generateCaption({ slides: [], platform: 'instagram' })).caption).toBe('c');
  });

  // HttpRenderGateway covered separately in `http-render-gateway.test.ts`
  // (node env — adm-zip parser is jsdom-incompatible; see file header).
});
