// tests/caption.test.ts — POST /caption/generate route.

import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../src/server.js';
import { _resetEnvForTests } from '../src/lib/env.js';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  _resetEnvForTests();
});

describe('POST /caption/generate', () => {
  it('returns caption + 30 hashtags + passthroughEstimate', async () => {
    const app = buildApp();
    const res = await app.request('/caption/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slides: [{ title: '훅' }, { title: '본문', body: 'x' }, { title: 'CTA' }],
        hashtagSeed: ['ai', 'react', 'startup'],
        platform: 'instagram',
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      caption: string;
      hashtags: { highReach: string[]; medium: string[]; niche: string[] };
      passthroughEstimate: number;
      platform: string;
      editable: boolean;
      platformVariants: { instagram: string; linkedin: string; threads: string[] };
    };
    expect(body.caption.length).toBeGreaterThan(0);
    expect(body.hashtags.highReach).toHaveLength(5);
    expect(body.hashtags.medium).toHaveLength(15);
    expect(body.hashtags.niche).toHaveLength(10);
    expect(body.passthroughEstimate).toBeGreaterThan(0);
    expect(body.platform).toBe('instagram');
    expect(body.editable).toBe(true);
    // Cycle 3 A2 — platform variants for all 3 targets always emitted.
    expect(body.platformVariants.instagram.length).toBeGreaterThan(0);
    expect(body.platformVariants.linkedin.length).toBeGreaterThan(0);
    expect(Array.isArray(body.platformVariants.threads)).toBe(true);
  });

  it('400 when slides empty', async () => {
    const app = buildApp();
    const res = await app.request('/caption/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slides: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('Cycle 3 A2 — accepts brandDsl + applies forbidden retry + signature inject', async () => {
    const app = buildApp();
    const res = await app.request('/caption/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slides: [{ title: '안녕하세요 오늘은 멋진 정보입니다' }, { title: 'b' }, { title: 'c' }],
        platform: 'linkedin',
        brandDsl: {
          voice: '대담',
          tone: 'formal',
          forbiddenPhrases: ['안녕하세요 오늘은'],
          signaturePhrases: ['오직 우리만의 가치'],
        },
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      caption: string;
      forbiddenStripped: string[];
      signatureInjected: string | null;
      platformVariants: { linkedin: string };
    };
    expect(body.forbiddenStripped).toContain('안녕하세요 오늘은');
    expect(body.signatureInjected).toBe('오직 우리만의 가치');
    expect(body.caption).toContain('오직 우리만의 가치');
    // formal tone replaces 👉 / linkedin variant strips hook emoji
    expect(body.platformVariants.linkedin).not.toContain('👉');
  });
});
