// tests/content.test.ts — /content/generate route + service mock-fallback path.

import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../src/server.js';
import { _resetEnvForTests } from '../src/lib/env.js';
import { _resetFailureBoundaries } from '../src/lib/failure-boundary.js';
import { _resetAnthropicClient } from '../src/services/anthropic-sdk.service.js';
import { generateContent } from '../src/services/content.service.js';
import { _internal } from '../src/services/content.service.js';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  delete process.env.ANTHROPIC_API_KEY;
  _resetEnvForTests();
  _resetAnthropicClient();
  _resetFailureBoundaries();
});

describe('POST /content/generate', () => {
  it('rejects empty body with 400', async () => {
    const app = buildApp();
    const res = await app.request('/content/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(400);
  });

  it('rejects slideCount out of range', async () => {
    const app = buildApp();
    const res = await app.request('/content/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic: 't', slideCount: 100 }),
    });
    expect(res.status).toBe(400);
  });

  it('returns mock slides when ANTHROPIC_API_KEY is missing', async () => {
    const result = await generateContent({ topic: '테스트', slideCount: 3 });
    expect(result.slides).toHaveLength(3);
    expect(result.metadata.via).toBe('mock');
    expect(result.slides[0]?.title).toContain('테스트');
  });

  it('parseSlidesJson handles fenced JSON', () => {
    const fenced = '```json\n{"slides":[{"title":"a","body":"b","caption":"c"}]}\n```';
    const slides = _internal.parseSlidesJson(fenced);
    expect(slides).toHaveLength(1);
    expect(slides[0]?.title).toBe('a');
  });

  it('mockSlides respects slideCount', () => {
    expect(_internal.mockSlides({ topic: 'x', slideCount: 7 })).toHaveLength(7);
  });
});
