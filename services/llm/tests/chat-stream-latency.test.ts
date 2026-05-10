// tests/chat-stream-latency.test.ts — Cycle 3 B1.
// Pins the SPEC §12 Cycle 3 acceptance: "first token < 1초" gate.
// We exercise the SSE generator with an INJECTED Claude streamer that emits the
// first token quickly — the gate is on the wrapper overhead, not on the vendor
// call (which depends on Anthropic latency in Docker smoke).
//
// Cycle 2 Fix P1-3 removed the 250ms wake-loop safety net, so wrapper overhead
// for the first token should now be < ~50ms even on a slow CI runner. We give
// 750ms of margin (1000ms - 250ms = 750ms) to stay clear of the SPEC gate.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { buildApp } from '../src/server.js';
import { _resetEnvForTests } from '../src/lib/env.js';
import { _resetFailureBoundaries } from '../src/lib/failure-boundary.js';
import { _resetClaudeDetectionForTests } from '../src/lib/claude-pool.js';
import { _resetAnthropicClient } from '../src/services/anthropic-sdk.service.js';

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

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

async function readSse(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) return '';
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
  }
  return raw;
}

describe('Cycle 3 B1 — first token < 1초', () => {
  it('streamClaude is mocked to emit instant first token; wrapper overhead < 750ms', async () => {
    // Mock the claude.service.streamClaude implementation so the test does not
    // depend on Anthropic. The mock invokes onToken synchronously (after one
    // microtask) → measured time is the wrapper + SSE encode overhead only.
    vi.doMock('../src/services/claude.service.js', () => ({
      streamClaude: async (
        _system: string,
        _user: string,
        onToken: (t: string) => void,
      ) => {
        // Microtask boundary, then emit first token.
        await Promise.resolve();
        onToken('첫');
        await new Promise((r) => setTimeout(r, 10));
        onToken('번째');
        return { text: '첫번째', usage: null, via: 'sdk' as const };
      },
      _markClaudeSuccess: () => undefined,
      getClaudeAvailability: async () => ({
        available: false,
        cliPath: null,
        pool: { size: 1, pending: 0, active: 0 },
        lastSuccessAt: null,
        breaker: {
          name: 'claude-cli' as const,
          state: 'closed' as const,
          failures: 0,
          successes: 0,
          lastFailureAt: null,
        },
      }),
    }));

    // Re-import buildApp AFTER mock registration.
    const { buildApp: buildAppMocked } = await import('../src/server.js');
    const app = buildAppMocked();

    const start = Date.now();
    const res = await app.request('/chat/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: '빠른 응답 테스트' }),
    });
    expect(res.status).toBe(200);

    // Collect frames until we see the first 'event: token' line and capture its
    // arrival time relative to the request start.
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let raw = '';
    let firstTokenAt: number | null = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      raw += decoder.decode(value, { stream: true });
      if (firstTokenAt === null && raw.includes('event: token')) {
        firstTokenAt = Date.now() - start;
        // keep draining so the response cleanly closes
      }
    }
    expect(firstTokenAt).not.toBeNull();
    // SPEC gate is 1000ms; we assert with 250ms safety margin = 750ms cap.
    expect(firstTokenAt!).toBeLessThan(750);
  }, 5000);

  it('done frame carries firstTokenMs + totalMs telemetry (Cycle 3 B1)', async () => {
    vi.doMock('../src/services/claude.service.js', () => ({
      streamClaude: async (
        _system: string,
        _user: string,
        onToken: (t: string) => void,
      ) => {
        await Promise.resolve();
        onToken('a');
        return { text: 'a', usage: null, via: 'sdk' as const };
      },
      _markClaudeSuccess: () => undefined,
      getClaudeAvailability: async () => ({
        available: false,
        cliPath: null,
        pool: { size: 1, pending: 0, active: 0 },
        lastSuccessAt: null,
        breaker: {
          name: 'claude-cli' as const,
          state: 'closed' as const,
          failures: 0,
          successes: 0,
          lastFailureAt: null,
        },
      }),
    }));
    const { buildApp: buildAppMocked } = await import('../src/server.js');
    const app = buildAppMocked();
    const res = await app.request('/chat/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'telemetry test' }),
    });
    const text = await readSse(res.body);
    expect(text).toContain('event: done');
    // The done frame's data line is JSON.stringified — extract and parse.
    const doneIdx = text.indexOf('event: done');
    const dataIdx = text.indexOf('data:', doneIdx);
    const newline = text.indexOf('\n', dataIdx);
    const dataLine = text.slice(dataIdx + 'data:'.length, newline).trim();
    const payload = JSON.parse(dataLine) as {
      firstTokenMs: number | null;
      totalMs: number;
    };
    expect(typeof payload.firstTokenMs).toBe('number');
    expect(payload.firstTokenMs).toBeGreaterThanOrEqual(0);
    expect(payload.totalMs).toBeGreaterThanOrEqual(payload.firstTokenMs!);
  }, 5000);

  it('overhead is bounded even when no token is emitted (error path < 750ms)', async () => {
    // No-LLM-backend → error frame fast path. Reuses real (non-mocked) module.
    vi.doUnmock('../src/services/claude.service.js');
    vi.resetModules();
    _resetClaudeDetectionForTests();
    _resetAnthropicClient();
    _resetFailureBoundaries();
    const { buildApp: buildAppFresh } = await import('../src/server.js');
    const app = buildAppFresh();
    const start = Date.now();
    const res = await app.request('/chat/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: '에러 경로' }),
    });
    await readSse(res.body);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(750);
  }, 5000);
});
