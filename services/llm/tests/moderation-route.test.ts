// tests/moderation-route.test.ts — POST /moderation/check.

import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../src/server.js';
import { _resetEnvForTests } from '../src/lib/env.js';
import { _resetModerationCache } from '../src/services/moderation.service.js';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  _resetEnvForTests();
  _resetModerationCache();
});

describe('POST /moderation/check', () => {
  it('approves benign text', async () => {
    const app = buildApp();
    const res = await app.request('/moderation/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '오늘 점심은 김밥' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { blocked: boolean };
    expect(body.blocked).toBe(false);
  });

  it('blocks political with userMessage', async () => {
    const app = buildApp();
    const res = await app.request('/moderation/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '대통령 후보' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      blocked: boolean;
      userMessage: { what: string; why: string };
    };
    expect(body.blocked).toBe(true);
    expect(body.userMessage.what).toBeDefined();
  });

  it('400 when text missing', async () => {
    const app = buildApp();
    const res = await app.request('/moderation/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(400);
  });
});
