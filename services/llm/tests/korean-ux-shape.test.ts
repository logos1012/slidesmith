// tests/korean-ux-shape.test.ts — Cycle 3 C1.
// Pin the contract: every endpoint that emits an error / blocked response
// returns the same Korean 4-원칙 (What/Why/Next/Recovery) shape.

import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/server.js';
import { _resetEnvForTests } from '../src/lib/env.js';
import { _resetFailureBoundaries, withBreaker } from '../src/lib/failure-boundary.js';
import { _resetClaudeDetectionForTests } from '../src/lib/claude-pool.js';
import { _resetAnthropicClient } from '../src/services/anthropic-sdk.service.js';

beforeEach(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.CLAUDE_CLI_PATH = '/nonexistent/claude-cli-test';
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GEMINI_API_KEY;
  _resetEnvForTests();
  _resetClaudeDetectionForTests();
  _resetAnthropicClient();
  _resetFailureBoundaries();
});

interface KoreanShape {
  what: string;
  why: string;
  next: string;
  recovery: string;
}

function assertKoreanShape(msg: KoreanShape): void {
  expect(msg.what).toBeTruthy();
  expect(msg.why).toBeTruthy();
  expect(msg.next).toBeTruthy();
  expect(msg.recovery).toBeTruthy();
  // Each field has Hangul.
  expect(msg.what).toMatch(/[가-힣]/);
  expect(msg.why).toMatch(/[가-힣]/);
  expect(msg.next).toMatch(/[가-힣]/);
  expect(msg.recovery).toMatch(/[가-힣]/);
}

describe('Cycle 3 C1 — Korean 4-원칙 unified shape across endpoints', () => {
  it('content/generate (CB-open) → 503 with 4-원칙 userMessage', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-fake';
    _resetEnvForTests();
    for (let i = 0; i < 5; i++) {
      await withBreaker('anthropic-sdk', async () => {
        throw new Error('simulated 500 internal_server_error');
      }).catch(() => undefined);
    }
    const app = buildApp();
    const res = await app.request('/content/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic: '주제', slideCount: 3 }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string; userMessage: KoreanShape };
    expect(body.error).toBe('CIRCUIT_OPEN');
    assertKoreanShape(body.userMessage);
    expect(body.userMessage.why).toContain('회로');
  });

  it('image/generate (no key) → 503 with 4-원칙 userMessage', async () => {
    const app = buildApp();
    const res = await app.request('/image/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'k', ratio: '4:5' }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { userMessage: KoreanShape };
    assertKoreanShape(body.userMessage);
    expect(body.userMessage.next).toContain('GEMINI_API_KEY');
  });

  it('moderation/check (blocked) → 200 with 4-원칙 userMessage', async () => {
    const app = buildApp();
    const res = await app.request('/moderation/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '대통령 후보의 공약' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { blocked: boolean; userMessage: KoreanShape };
    expect(body.blocked).toBe(true);
    assertKoreanShape(body.userMessage);
  });

  it('chat/stream (no backend) → SSE error frame with 4-원칙 userMessage', async () => {
    const app = buildApp();
    const res = await app.request('/chat/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: '안녕' }),
    });
    expect(res.status).toBe(200);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let raw = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      raw += decoder.decode(value, { stream: true });
    }
    expect(raw).toContain('event: error');
    // Extract the data: line for the error frame and parse JSON.
    const errIdx = raw.indexOf('event: error');
    const dataIdx = raw.indexOf('data:', errIdx);
    const eol = raw.indexOf('\n', dataIdx);
    const dataLine = raw.slice(dataIdx + 'data:'.length, eol).trim();
    const payload = JSON.parse(dataLine) as {
      code: string;
      userMessage: KoreanShape;
    };
    expect(payload.code).toBe('NO_LLM_BACKEND');
    assertKoreanShape(payload.userMessage);
  });
});
