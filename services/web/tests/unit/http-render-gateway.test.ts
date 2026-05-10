// @vitest-environment node
// http-render-gateway.test.ts — v1.0.1 contract gap fix.
// Lives in node env because adm-zip's parser misbehaves under vitest+jsdom
// (verified empirically: same Buffer can be built by AdmZip.toBuffer() and
// then `new AdmZip(buf).getEntries()` returns 0 entries inside jsdom).
// Production runs in pure Node, so this is a test-only env constraint.
import { describe, it, expect, beforeEach } from 'vitest';
import type { z } from 'zod';
import AdmZip from 'adm-zip';
import { HttpRenderGateway } from '@/repositories/http/HttpRenderGateway';
import type { IServiceClient, ServiceFetchInit } from '@/repositories/interfaces/IServiceClient';
import { _clearForTest as clearRenderTempStore } from '@/lib/render-temp-store';

class MockClient implements IServiceClient {
  baseUrl = 'http://mock';
  calls: Array<{ method: string; path: string; body?: unknown }> = [];
  fetchResponses = new Map<string, () => Response>();
  setFetch(path: string, factory: () => Response) { this.fetchResponses.set(path, factory); }
  async getJson<T>(path: string): Promise<T> {
    this.calls.push({ method: 'GET', path });
    return {} as T;
  }
  async postJson<T>(path: string, body: unknown, _init?: ServiceFetchInit, _schema?: z.ZodSchema<T>): Promise<T> {
    this.calls.push({ method: 'POST', path, body });
    return {} as T;
  }
  async fetch(path: string, init?: ServiceFetchInit): Promise<Response> {
    this.calls.push({ method: init?.method ?? 'GET', path, body: init?.body });
    const factory = this.fetchResponses.get(path);
    if (factory) return factory();
    return new Response('{}', { status: 200 });
  }
}

function buildZipWithPngs(count: number): Buffer {
  const zip = new AdmZip();
  for (let i = 0; i < count; i++) {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, i, i, i, i]);
    zip.addFile(`slide-${String(i).padStart(3, '0')}.png`, pngHeader);
  }
  return zip.toBuffer();
}

function bufToAb(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
}

describe('HttpRenderGateway (v1.0.1 contract gap fix)', () => {
  beforeEach(() => { clearRenderTempStore(); });

  it('translates ContentSlide → {id,html} and returns same-process URLs', async () => {
    const c = new MockClient();
    const zipBuf = buildZipWithPngs(2);
    c.setFetch('/render', () => new Response(bufToAb(zipBuf), {
      status: 200, headers: { 'content-type': 'application/zip' },
    }));
    const r = new HttpRenderGateway(c);
    const out = await r.render({
      templateId: 't', ratio: '1:1',
      slides: [
        { index: 0, title: 'T0', body: 'B0' },
        { index: 1, title: 'T1', body: 'B1' },
      ],
    });
    expect(out.pngUrls).toHaveLength(2);
    expect(out.pngUrls[0]).toMatch(/\/api\/render\/temp\/[\w-]+\/0$/);
    expect(out.pngUrls[1]).toMatch(/\/api\/render\/temp\/[\w-]+\/1$/);
    expect(out.zipUrl).toMatch(/\/api\/render\/temp\/[\w-]+\/zip$/);
    expect(out.durationMs).toBeGreaterThanOrEqual(0);
    const renderCall = c.calls.find((x) => x.path === '/render');
    expect(renderCall).toBeDefined();
    expect(renderCall?.method).toBe('POST');
    const sentBody = JSON.parse(String(renderCall?.body ?? '{}')) as {
      slides: Array<{ id: string; html: string }>;
      aspectRatio: string; format: string; watermark?: { enabled: boolean };
    };
    expect(sentBody.aspectRatio).toBe('1:1');
    expect(sentBody.format).toBe('png');
    expect(sentBody.slides).toHaveLength(2);
    expect(sentBody.slides[0]?.id).toBe('slide-000');
    expect(sentBody.slides[0]?.html).toContain('T0');
    expect(sentBody.slides[0]?.html).toContain('B0');
    // No watermark on this call.
    expect(sentBody.watermark).toBeUndefined();
  });

  it('passes watermark to render service when input.watermark === true', async () => {
    const c = new MockClient();
    const zipBuf = buildZipWithPngs(1);
    c.setFetch('/render', () => new Response(bufToAb(zipBuf), {
      status: 200, headers: { 'content-type': 'application/zip' },
    }));
    const r = new HttpRenderGateway(c);
    await r.render({
      templateId: 't', ratio: '4:5', watermark: true,
      slides: [{ index: 0, title: 't', body: 'b' }],
    });
    const sent = JSON.parse(String(c.calls.find((x) => x.path === '/render')?.body ?? '{}')) as {
      watermark?: { enabled: boolean; text: string };
    };
    expect(sent.watermark?.enabled).toBe(true);
    expect(sent.watermark?.text).toMatch(/slidesmith/i);
  });

  it('throws on non-200 from render upstream', async () => {
    const c = new MockClient();
    c.setFetch('/render', () => new Response('boom', { status: 500 }));
    const r = new HttpRenderGateway(c);
    await expect(
      r.render({ templateId: 't', ratio: '1:1', slides: [{ index: 0, title: 't', body: 'b' }] }),
    ).rejects.toThrow(/500/);
  });

  it('throws when ZIP contains no PNG entries', async () => {
    const c = new MockClient();
    const zip = new AdmZip();
    zip.addFile('readme.txt', Buffer.from('no pngs here'));
    c.setFetch('/render', () => new Response(bufToAb(zip.toBuffer()), {
      status: 200, headers: { 'content-type': 'application/zip' },
    }));
    const r = new HttpRenderGateway(c);
    await expect(
      r.render({ templateId: 't', ratio: '1:1', slides: [{ index: 0, title: 't', body: 'b' }] }),
    ).rejects.toThrow(/0 PNG/);
  });
});
