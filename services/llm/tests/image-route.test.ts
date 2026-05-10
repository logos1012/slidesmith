// tests/image-route.test.ts — POST /image/generate (mock-fallback path).

import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../src/server.js';
import { _resetEnvForTests } from '../src/lib/env.js';
import { _resetFailureBoundaries } from '../src/lib/failure-boundary.js';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  delete process.env.GEMINI_API_KEY;
  _resetEnvForTests();
  _resetFailureBoundaries();
});

describe('POST /image/generate', () => {
  it('returns 503 + userMessage when GEMINI_API_KEY missing', async () => {
    const app = buildApp();
    const res = await app.request('/image/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'test', ratio: '1:1' }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      ok: boolean;
      userMessage: { what: string };
      via: string;
    };
    expect(body.ok).toBe(false);
    expect(body.via).toBe('mock');
    expect(body.userMessage.what).toContain('이미지');
  });

  it('400 on invalid ratio', async () => {
    const app = buildApp();
    const res = await app.request('/image/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'x', ratio: '99:99' }),
    });
    expect(res.status).toBe(400);
  });

  it('400 on missing prompt', async () => {
    const app = buildApp();
    const res = await app.request('/image/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(400);
  });
});
