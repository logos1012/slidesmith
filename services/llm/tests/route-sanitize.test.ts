// tests/route-sanitize.test.ts — Cycle 2 Fix P1-1 + F4 contract gate.
// Pin the route-level guarantee: NO API key prefix ever reaches the response,
// and CB-open errors return 503 (not 502).

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

describe('chat/stream — sanitize + status', () => {
  it('error frame never contains sk-ant-* even if NO_LLM_BACKEND path runs', async () => {
    const app = buildApp();
    const res = await app.request('/chat/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: '키 leak 검증' }),
    });
    const text = await res.text();
    expect(text).not.toMatch(/sk-ant-[A-Za-z0-9_-]{8,}/);
    expect(text).not.toMatch(/AIza[A-Za-z0-9_-]{16,}/);
  });
});

describe('content/generate — sanitize + 503 distinguish', () => {
  it('returns 503 + CIRCUIT_OPEN userMessage when anthropic-sdk breaker is open', async () => {
    // Force anthropic-sdk breaker open via 5 consecutive errors carrying
    // a fake API key prefix in the message.
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-ABC123_fake_for_test';
    _resetEnvForTests();
    for (let i = 0; i < 5; i++) {
      await withBreaker('anthropic-sdk', async () => {
        throw new Error(
          'simulated 401 invalid x-api-key sk-ant-api03-LEAKEDfakeKey1234',
        );
      }).catch(() => undefined);
    }
    const app = buildApp();
    const res = await app.request('/content/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic: 'circuit-test', slideCount: 3 }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      error: string;
      userMessage: { what: string; why: string };
    };
    expect(body.error).toBe('CIRCUIT_OPEN');
    expect(body.userMessage.why).not.toMatch(/sk-ant-[A-Za-z0-9_-]{8,}/);
  });
});

describe('image/generate — sanitize key-missing', () => {
  it('503 with key missing + no leak in userMessage.why', async () => {
    const app = buildApp();
    const res = await app.request('/image/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'test', ratio: '1:1', count: 1 }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { userMessage: { why: string; next: string } };
    // Cycle 3 C1 — Korean 4-원칙: "Gemini API 키가 설정되지 않았거나..." (key missing).
    expect(body.userMessage.why).toMatch(/Gemini API 키/);
    expect(body.userMessage.why).not.toMatch(/sk-ant-/);
    expect(body.userMessage.next).toContain('GEMINI_API_KEY');
  });
});
