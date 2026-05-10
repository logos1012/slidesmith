// tests/korean-ux-helper.test.ts — Cycle 3 Fix F1.
// Pin the Phase 6 contract: every error-emitting endpoint that goes through
// `respondWithKoreanError` returns the same { error, userMessage } shape.
// New endpoints inherit the 4-원칙 contract automatically by calling the
// helper — no per-route boilerplate, no risk of forgetting userMessage.

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import {
  buildKoreanErrorBody,
  errorCodeFor,
  respondWithKoreanError,
} from '../src/lib/korean-ux.js';

describe('errorCodeFor — canonical error code map', () => {
  it.each([
    ['unauthorized', 'UNAUTHORIZED'],
    ['rate_limited', 'RATE_LIMITED'],
    ['circuit_open', 'CIRCUIT_OPEN'],
    ['no_backend', 'NO_LLM_BACKEND'],
    ['network', 'NETWORK_ERROR'],
    ['server_error', 'SERVER_ERROR'],
  ] as const)('%s → %s', (cls, code) => {
    expect(errorCodeFor(cls)).toBe(code);
  });

  it('unknown class falls back to provided fallback (per-route catalog)', () => {
    expect(errorCodeFor('unknown', 'CONTENT_GEN_FAILED')).toBe('CONTENT_GEN_FAILED');
    expect(errorCodeFor('unknown', 'IMAGE_GEN_FAILED')).toBe('IMAGE_GEN_FAILED');
    expect(errorCodeFor('unknown', 'STREAM_ERROR')).toBe('STREAM_ERROR');
  });

  it('unknown class with no fallback uses INTERNAL_ERROR', () => {
    expect(errorCodeFor('unknown')).toBe('INTERNAL_ERROR');
  });
});

describe('buildKoreanErrorBody — pure builder', () => {
  it('401 → 503 + UNAUTHORIZED + Korean 4-원칙 shape', () => {
    const { body, status, cls } = buildKoreanErrorBody({ status: 401 }, '테스트 실패');
    expect(cls).toBe('unauthorized');
    expect(status).toBe(503);
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.userMessage.what).toBe('테스트 실패');
    expect(body.userMessage.why).toMatch(/[가-힣]/);
    expect(body.userMessage.next).toMatch(/[가-힣]/);
    expect(body.userMessage.recovery).toMatch(/[가-힣]/);
  });

  it('429 → 429 + RATE_LIMITED', () => {
    const { body, status } = buildKoreanErrorBody({ status: 429 }, 'x');
    expect(status).toBe(429);
    expect(body.error).toBe('RATE_LIMITED');
  });

  it('Breaker open → 503 + CIRCUIT_OPEN', () => {
    const { body, status } = buildKoreanErrorBody(new Error('Breaker is open'), 'x');
    expect(status).toBe(503);
    expect(body.error).toBe('CIRCUIT_OPEN');
  });

  it('unknown class with custom fallback code', () => {
    const { body } = buildKoreanErrorBody(new Error('weird'), 'x', 'CONTENT_GEN_FAILED');
    expect(body.error).toBe('CONTENT_GEN_FAILED');
  });
});

describe('respondWithKoreanError — Hono integration (Phase 6 contract auto-enforce)', () => {
  it('a brand new endpoint that uses the helper inherits the 4-원칙 shape', async () => {
    // Simulate a freshly-added endpoint (e.g. /transcribe/audio in Phase 6+).
    const app = new Hono();
    app.post('/new-endpoint/anything', (c) => {
      return respondWithKoreanError(c, { status: 401 }, '신규 작업 실패', 'NEW_ENDPOINT_FAILED');
    });
    const res = await app.request('/new-endpoint/anything', { method: 'POST' });
    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      error: string;
      userMessage: { what: string; why: string; next: string; recovery: string };
    };
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.userMessage.what).toBe('신규 작업 실패');
    expect(body.userMessage.why).toMatch(/[가-힣]/);
    expect(body.userMessage.next).toMatch(/[가-힣]/);
    expect(body.userMessage.recovery).toMatch(/[가-힣]/);
  });

  it('extra fields (e.g. via, message) merge into the response body', async () => {
    const app = new Hono();
    app.post('/x', (c) =>
      respondWithKoreanError(c, new Error('500 internal_server_error'), 'X 실패', 'X_FAILED', {
        via: 'mock',
        debugId: 'abc-123',
      }),
    );
    const res = await app.request('/x', { method: 'POST' });
    expect(res.status).toBe(502);
    const body = (await res.json()) as {
      error: string;
      via: string;
      debugId: string;
      userMessage: { why: string };
    };
    expect(body.error).toBe('SERVER_ERROR');
    expect(body.via).toBe('mock');
    expect(body.debugId).toBe('abc-123');
    expect(body.userMessage.why).toContain('외부 LLM 서버');
  });

  it('rate-limited path returns 429 status code (passthrough so caller can backoff)', async () => {
    const app = new Hono();
    app.post('/x', (c) =>
      respondWithKoreanError(c, { status: 429 }, '한도 초과', 'X_FAILED'),
    );
    const res = await app.request('/x', { method: 'POST' });
    expect(res.status).toBe(429);
  });
});
