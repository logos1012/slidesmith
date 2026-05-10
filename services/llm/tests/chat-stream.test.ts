// tests/chat-stream.test.ts — POST /chat/stream SSE error path
// (no-LLM-backend → 'error' frame in Korean What/Why/Next/Recovery).

import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../src/server.js';
import { _resetEnvForTests } from '../src/lib/env.js';
import { _resetFailureBoundaries } from '../src/lib/failure-boundary.js';
import { _resetClaudeDetectionForTests } from '../src/lib/claude-pool.js';
import { _resetAnthropicClient } from '../src/services/anthropic-sdk.service.js';

async function readSseFrames(stream: ReadableStream<Uint8Array> | null): Promise<string[]> {
  if (!stream) return [];
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
  }
  return raw
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.CLAUDE_CLI_PATH = '/nonexistent/claude-cli-test';
  delete process.env.ANTHROPIC_API_KEY;
  _resetEnvForTests();
  _resetClaudeDetectionForTests();
  _resetAnthropicClient();
  _resetFailureBoundaries();
});

describe('POST /chat/stream', () => {
  it('400 on empty body', async () => {
    const app = buildApp();
    const res = await app.request('/chat/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(400);
  });

  it('emits Korean error frame when no LLM backend is available', async () => {
    const app = buildApp();
    const res = await app.request('/chat/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: '안녕' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const frames = await readSseFrames(res.body);
    const errorFrame = frames.find((f) => f.includes('event: error'));
    expect(errorFrame).toBeDefined();
    expect(errorFrame).toMatch(/무엇이|왜|다음|회복/);
  }, 10000);

  it('completes fast on no-backend (no 250ms wake-loop padding) [Cycle 2 Fix P1-3]', async () => {
    // The wake-loop safety net was previously a 250ms setTimeout. After Fix
    // P1-3 it is gone — the SSE generator now resolves on the same micro-task
    // as the .finally(state.done = true) callback. We measure end-to-end SSE
    // completion and assert it stays well under what the safety net would
    // have produced (≥250ms for a fast-fail with no real network hops).
    const app = buildApp();
    const start = Date.now();
    const res = await app.request('/chat/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: '빠른' }),
    });
    await readSseFrames(res.body);
    const elapsed = Date.now() - start;
    // Generous bound: must be <250ms (the previous safety-net floor) since
    // there is no real LLM call and only synchronous error-mapping happens.
    expect(elapsed).toBeLessThan(250);
  }, 5000);
});
