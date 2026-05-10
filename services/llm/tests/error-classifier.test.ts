// tests/error-classifier.test.ts — Cycle 3 A1 + C1.
// Pin classifyError() + mapErrorToKoreanUserMessage() — every vendor error
// shape must funnel into one of seven canonical buckets with a Korean 4-원칙
// (What/Why/Next/Recovery) message.

import { describe, it, expect } from 'vitest';
import {
  classifyError,
  mapErrorToKoreanUserMessage,
  statusCodeFor,
} from '../src/lib/sanitize-error.js';

describe('classifyError — vendor error shapes', () => {
  it('detects 401 from numeric status field (Anthropic.APIError shape)', () => {
    expect(classifyError({ status: 401, message: 'Unauthorized' })).toBe('unauthorized');
    expect(classifyError({ statusCode: 401 })).toBe('unauthorized');
  });

  it('detects 401 from "401" / "Invalid API Key" / "x-api-key" message text', () => {
    expect(classifyError(new Error('401 invalid x-api-key sk-ant-fake'))).toBe('unauthorized');
    expect(classifyError(new Error('Invalid API Key supplied'))).toBe('unauthorized');
    expect(classifyError(new Error('authentication_error'))).toBe('unauthorized');
  });

  it('detects 429 from numeric status', () => {
    expect(classifyError({ status: 429, message: 'too many' })).toBe('rate_limited');
  });

  it('detects 429 from "rate limit" / "quota" message', () => {
    expect(classifyError(new Error('429 rate_limit_exceeded'))).toBe('rate_limited');
    expect(classifyError(new Error('quota exhausted'))).toBe('rate_limited');
    expect(classifyError(new Error('Too many requests'))).toBe('rate_limited');
  });

  it('detects 5xx from numeric status (500 / 502 / 503 / 504)', () => {
    for (const status of [500, 502, 503, 504]) {
      expect(classifyError({ status })).toBe('server_error');
    }
  });

  it('detects 5xx from message text variants', () => {
    expect(classifyError(new Error('overloaded'))).toBe('server_error');
    expect(classifyError(new Error('internal_server_error'))).toBe('server_error');
    expect(classifyError(new Error('502 Bad Gateway'))).toBe('server_error');
    expect(classifyError(new Error('Service Unavailable'))).toBe('server_error');
  });

  it('detects circuit_open before generic message parse', () => {
    expect(classifyError(new Error('Breaker is open'))).toBe('circuit_open');
  });

  it('detects no_backend marker', () => {
    expect(classifyError(new Error('NO_LLM_BACKEND'))).toBe('no_backend');
  });

  it('detects network errors (ECONNREFUSED / ETIMEDOUT / ENOTFOUND / aborted)', () => {
    expect(classifyError(new Error('ECONNREFUSED 1.2.3.4:443'))).toBe('network');
    expect(classifyError(new Error('ETIMEDOUT'))).toBe('network');
    expect(classifyError(new Error('ENOTFOUND api.anthropic.com'))).toBe('network');
    expect(classifyError(new Error('socket hang up'))).toBe('network');
    expect(classifyError(new Error('request aborted'))).toBe('network');
  });

  it('falls back to unknown for benign messages', () => {
    expect(classifyError(new Error('something weird'))).toBe('unknown');
    expect(classifyError('plain string')).toBe('unknown');
    expect(classifyError(null)).toBe('unknown');
    expect(classifyError(undefined)).toBe('unknown');
  });

  it('prefers numeric status over message-text inference', () => {
    // status 429 should win even if message also mentions "401".
    expect(classifyError({ status: 429, message: '401-style text' })).toBe('rate_limited');
  });
});

describe('mapErrorToKoreanUserMessage — 4-원칙 shape', () => {
  it('every class returns full {what, why, next, recovery} in 한국어', () => {
    const cases = [
      { err: { status: 401 }, klass: 'unauthorized' },
      { err: { status: 429 }, klass: 'rate_limited' },
      { err: { status: 500 }, klass: 'server_error' },
      { err: new Error('Breaker is open'), klass: 'circuit_open' },
      { err: new Error('NO_LLM_BACKEND'), klass: 'no_backend' },
      { err: new Error('ECONNREFUSED'), klass: 'network' },
      { err: new Error('something else'), klass: 'unknown' },
    ] as const;
    for (const { err, klass } of cases) {
      const msg = mapErrorToKoreanUserMessage(err, { what: '테스트' });
      expect(msg.class).toBe(klass);
      expect(msg.what).toBe('테스트');
      expect(msg.why.length).toBeGreaterThan(5);
      expect(msg.next.length).toBeGreaterThan(5);
      expect(msg.recovery.length).toBeGreaterThan(5);
      // Korean character class — every message must contain Hangul.
      expect(msg.why).toMatch(/[가-힣]/);
      expect(msg.next).toMatch(/[가-힣]/);
      expect(msg.recovery).toMatch(/[가-힣]/);
    }
  });

  it('401 message mentions API 키', () => {
    const msg = mapErrorToKoreanUserMessage({ status: 401 }, { what: '실패' });
    expect(msg.why).toContain('API 키');
  });

  it('429 message mentions 한도', () => {
    const msg = mapErrorToKoreanUserMessage({ status: 429 }, { what: '실패' });
    expect(msg.why).toContain('한도');
  });

  it('5xx message mentions 외부 LLM 서버', () => {
    const msg = mapErrorToKoreanUserMessage({ status: 503 }, { what: '실패' });
    expect(msg.why).toContain('외부 LLM 서버');
  });

  it('circuit_open message mentions 회로', () => {
    const msg = mapErrorToKoreanUserMessage(new Error('Breaker is open'), { what: '실패' });
    expect(msg.why).toContain('회로');
  });

  it('no_backend message names ANTHROPIC_API_KEY', () => {
    const msg = mapErrorToKoreanUserMessage(new Error('NO_LLM_BACKEND'), { what: '실패' });
    expect(msg.next).toContain('ANTHROPIC_API_KEY');
  });

  it('unknown message echoes a sanitized why (no key prefix leak)', () => {
    const msg = mapErrorToKoreanUserMessage(
      new Error('boom! sk-ant-api03-leaked123456789012345'),
      { what: '실패' },
    );
    expect(msg.why).not.toMatch(/sk-ant-api03/);
    expect(msg.why).toContain('sk-ant-***');
  });
});

describe('statusCodeFor — HTTP code mapping', () => {
  it('rate_limited → 429 (passthrough so caller can backoff)', () => {
    expect(statusCodeFor('rate_limited')).toBe(429);
  });
  it('unauthorized / circuit_open / no_backend → 503 (config-side / unavailable)', () => {
    expect(statusCodeFor('unauthorized')).toBe(503);
    expect(statusCodeFor('circuit_open')).toBe(503);
    expect(statusCodeFor('no_backend')).toBe(503);
  });
  it('server_error / network / unknown → 502 (bad gateway)', () => {
    expect(statusCodeFor('server_error')).toBe(502);
    expect(statusCodeFor('network')).toBe(502);
    expect(statusCodeFor('unknown')).toBe(502);
  });
});
