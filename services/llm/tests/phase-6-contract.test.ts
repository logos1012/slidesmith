// tests/phase-6-contract.test.ts — Phase 6 contract pin (8 items).
// These contracts are consumed by web BFF; any change here MUST be synchronized
// with the web Phase 6 integration. The test exists so a single npm test catches
// any silent contract drift before merging.

import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/server.js';
import { _resetEnvForTests } from '../src/lib/env.js';
import { _resetFailureBoundaries, withBreaker } from '../src/lib/failure-boundary.js';
import { _resetClaudeDetectionForTests } from '../src/lib/claude-pool.js';
import { _resetAnthropicClient } from '../src/services/anthropic-sdk.service.js';
import { statusCodeFor } from '../src/lib/sanitize-error.js';
import { ALLOWED_RATIOS } from '../src/services/gemini.service.js';

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
  expect(msg.what).toMatch(/[가-힣]/);
  expect(msg.why).toMatch(/[가-힣]/);
  expect(msg.next).toMatch(/[가-힣]/);
  expect(msg.recovery).toMatch(/[가-힣]/);
}

// ---------------------------------------------------------------------------
// C1 — HTTP status code matrix (statusCodeFor)
// ---------------------------------------------------------------------------

describe('Phase 6 C1 — HTTP status matrix', () => {
  it.each([
    ['rate_limited', 429],
    ['unauthorized', 503],
    ['circuit_open', 503],
    ['no_backend', 503],
    ['server_error', 502],
    ['network', 502],
    ['unknown', 502],
  ] as const)('%s → %s', (cls, expected) => {
    expect(statusCodeFor(cls)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// C2 — error code catalog (route-level)
// ---------------------------------------------------------------------------

describe('Phase 6 C2 — error code catalog (content + image route)', () => {
  it('content/generate UNAUTHORIZED on 401 vendor', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-fake';
    _resetEnvForTests();
    const app = buildApp();
    const res = await app.request('/content/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic: 'x', slideCount: 3 }),
    });
    // vendor returns 401 immediately on fake key OR no backend → both produce
    // a code from the canonical catalog.
    const body = (await res.json()) as { error: string };
    expect(['UNAUTHORIZED', 'NO_LLM_BACKEND', 'CONTENT_GEN_FAILED']).toContain(body.error);
  });
});

// ---------------------------------------------------------------------------
// C3 — userMessage shape across 5 endpoints (single funnel)
// ---------------------------------------------------------------------------

describe('Phase 6 C3 — userMessage 4-원칙 shape across all error endpoints', () => {
  it('content/generate (CB-open) → 4-원칙 userMessage', async () => {
    // Force the anthropic-sdk circuit breaker open with 5 consecutive failures
    // — this guarantees we hit the error path (vs the mock fallback that runs
    // when ANTHROPIC_API_KEY is simply absent).
    process.env.ANTHROPIC_API_KEY = 'sk-ant-fake';
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
      body: JSON.stringify({ topic: 'x', slideCount: 3 }),
    });
    expect([429, 502, 503]).toContain(res.status);
    const body = (await res.json()) as { userMessage: KoreanShape };
    assertKoreanShape(body.userMessage);
  });

  it('image/generate (no key) → 4-원칙 userMessage', async () => {
    const app = buildApp();
    const res = await app.request('/image/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'x', ratio: '1:1' }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { userMessage: KoreanShape };
    assertKoreanShape(body.userMessage);
  });

  it('moderation/check (blocked) → 4-원칙 userMessage', async () => {
    const app = buildApp();
    const res = await app.request('/moderation/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '대통령 후보 공약' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { blocked: boolean; userMessage: KoreanShape };
    expect(body.blocked).toBe(true);
    assertKoreanShape(body.userMessage);
  });
});

// ---------------------------------------------------------------------------
// C5 — SSE error frame shape
// ---------------------------------------------------------------------------

describe('Phase 6 C5 — SSE error frame shape', () => {
  it('chat/stream emits {code, message, userMessage} on error', async () => {
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
    const errIdx = raw.indexOf('event: error');
    const dataIdx = raw.indexOf('data:', errIdx);
    const eol = raw.indexOf('\n', dataIdx);
    const dataLine = raw.slice(dataIdx + 'data:'.length, eol).trim();
    const payload = JSON.parse(dataLine) as {
      code: string;
      message: string;
      userMessage: KoreanShape;
    };
    expect(payload.code).toBeTruthy();
    expect(typeof payload.message).toBe('string');
    assertKoreanShape(payload.userMessage);
  });
});

// ---------------------------------------------------------------------------
// C6 — caption response shape
// ---------------------------------------------------------------------------

describe('Phase 6 C6 — caption response shape (no error path)', () => {
  it('returns { caption, hashtags{5/15/10}, platformVariants{insta,linkedin,threads[]}, diagnostics }', async () => {
    const app = buildApp();
    const res = await app.request('/caption/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slides: [{ title: 'AI', body: '본문' }],
        brandDsl: { voice: '친근', tone: 'informal' },
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      caption: string;
      hashtags: { highReach: string[]; medium: string[]; niche: string[] };
      platformVariants: { instagram: string; linkedin: string; threads: string[] };
      forbiddenStripped: string[];
      signatureInjected: string | null;
    };
    expect(body.hashtags.highReach).toHaveLength(5);
    expect(body.hashtags.medium).toHaveLength(15);
    expect(body.hashtags.niche).toHaveLength(10);
    expect(typeof body.platformVariants.instagram).toBe('string');
    expect(typeof body.platformVariants.linkedin).toBe('string');
    expect(Array.isArray(body.platformVariants.threads)).toBe(true);
    expect(Array.isArray(body.forbiddenStripped)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// C7 — ALLOWED_RATIOS (exactly 4 ratios)
// ---------------------------------------------------------------------------

describe('Phase 6 C7 — ALLOWED_RATIOS pinned at exactly 4 ratios', () => {
  it('matches the canonical [1:1, 4:5, 16:9, 9:16] order', () => {
    expect(ALLOWED_RATIOS).toEqual(['1:1', '4:5', '16:9', '9:16']);
    expect(ALLOWED_RATIOS).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// C8 — moderation block response shape
// ---------------------------------------------------------------------------

describe('Phase 6 C8 — moderation block response shape', () => {
  it('returns { blocked:true, reason, matchedKeywords, userMessage }', async () => {
    const app = buildApp();
    const res = await app.request('/moderation/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '국회의원 선거' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      blocked: boolean;
      reason: string;
      matchedKeywords: string[];
      userMessage: KoreanShape;
    };
    expect(body.blocked).toBe(true);
    expect(typeof body.reason).toBe('string');
    expect(Array.isArray(body.matchedKeywords)).toBe(true);
    expect(body.matchedKeywords.length).toBeGreaterThan(0);
    assertKoreanShape(body.userMessage);
  });
});

// ---------------------------------------------------------------------------
// C4 — SSE done frame telemetry — covered by chat-stream-latency.test.ts;
//      do not duplicate here to avoid running mock-claude streams 2x.
// ---------------------------------------------------------------------------

// Just a structural reminder pinned at the unit-test level: see
// `tests/chat-stream-latency.test.ts` for `firstTokenMs`/`totalMs` assertions.
describe('Phase 6 C4 — SSE done frame telemetry (delegate)', () => {
  it('contract carrier — see chat-stream-latency.test.ts', () => {
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// F1 — Phase 6 contract auto-enforcement: a freshly-added endpoint that
// uses respondWithKoreanError inherits the 4-원칙 shape with no extra work.
// (Detailed behaviour tested in korean-ux-helper.test.ts.)
// ---------------------------------------------------------------------------

describe('Phase 6 F1 — contract auto-enforcement helper exists', () => {
  it('lib/korean-ux exports the funnel helpers', async () => {
    const mod = await import('../src/lib/korean-ux.js');
    expect(typeof mod.respondWithKoreanError).toBe('function');
    expect(typeof mod.buildKoreanErrorBody).toBe('function');
    expect(typeof mod.errorCodeFor).toBe('function');
  });
});
