// tests/image-validation.test.ts — Cycle 3 B2.
// Pin gemini.service: 4 ratios accepted, PNG header validation, placeholder
// rejected, route validates ratio enum at the boundary.

import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../src/server.js';
import { _resetEnvForTests } from '../src/lib/env.js';
import { _resetFailureBoundaries } from '../src/lib/failure-boundary.js';
import { ALLOWED_RATIOS, _internal } from '../src/services/gemini.service.js';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  delete process.env.GEMINI_API_KEY;
  _resetEnvForTests();
  _resetFailureBoundaries();
});

describe('Cycle 3 B2 — image validation', () => {
  it('ALLOWED_RATIOS contains exactly the 4 supported aspect ratios', () => {
    expect(ALLOWED_RATIOS).toEqual(['1:1', '4:5', '16:9', '9:16']);
  });

  it('isPng rejects non-PNG buffers', () => {
    expect(_internal.isPng(Buffer.from('hello world'))).toBe(false);
    expect(_internal.isPng(Buffer.alloc(0))).toBe(false);
    expect(_internal.isPng(Buffer.from([0x89, 0x50, 0x4e]))).toBe(false); // truncated
  });

  it('isPng accepts valid PNG magic bytes', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(_internal.isPng(Buffer.concat([pngHeader, Buffer.alloc(64)]))).toBe(true);
  });

  it('route accepts all 4 supported ratios at the Zod boundary', async () => {
    const app = buildApp();
    for (const ratio of ALLOWED_RATIOS) {
      const res = await app.request('/image/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: 'test', ratio }),
      });
      // Zod accepts → service returns 503 (no GEMINI_API_KEY) — both confirm
      // the ratio passed validation.
      expect([200, 502, 503]).toContain(res.status);
    }
  });

  it('route rejects unsupported ratios at the Zod boundary', async () => {
    const app = buildApp();
    for (const bad of ['2:3', '3:2', '1:2', '21:9', '99:99']) {
      const res = await app.request('/image/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: 'test', ratio: bad }),
      });
      expect(res.status).toBe(400);
    }
  });

  it('returns 503 + Korean 4-원칙 userMessage on missing key (Cycle 3 C1 unified)', async () => {
    const app = buildApp();
    const res = await app.request('/image/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'no key', ratio: '1:1' }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      via: string;
      userMessage: { what: string; why: string; next: string; recovery: string };
    };
    expect(body.via).toBe('mock');
    // Korean voice (Cycle 3 C1)
    expect(body.userMessage.why).toMatch(/[가-힣]/);
    expect(body.userMessage.next).toMatch(/[가-힣]/);
    expect(body.userMessage.recovery).toMatch(/[가-힣]/);
    // Image-route specifically names the GEMINI key (not Anthropic).
    expect(body.userMessage.next).toContain('GEMINI_API_KEY');
    expect(body.userMessage.why).toContain('Gemini');
  });
});
