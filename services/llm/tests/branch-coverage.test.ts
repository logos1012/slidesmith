// tests/branch-coverage.test.ts — Cycle 3 B3.
// Top up coverage on the new branches: image route catch path, content
// errorCodeFor branches across all error classes, gemini service runScript
// failure variants.
//
// Note on isolation: vitest's vi.doMock applies to the next dynamic import.
// We call vi.resetModules() + vi.doUnmock() between subtests so the modules
// are re-imported fresh and previous mocks don't leak across cases. We also
// import buildApp / generateImage AFTER the mock registration in each test.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { _resetEnvForTests } from '../src/lib/env.js';
import { _resetFailureBoundaries } from '../src/lib/failure-boundary.js';
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
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock('../src/services/gemini.service.js');
  vi.doUnmock('../src/services/content.service.js');
  vi.doUnmock('execa');
  vi.resetModules();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// image route catch path: gemini.service throws (not !ok)
// ---------------------------------------------------------------------------

describe('image route — catch path (Cycle 3 B3)', () => {
  it('returns 502 on synchronous exception thrown from generateImage', async () => {
    vi.doMock('../src/services/gemini.service.js', () => ({
      generateImage: async () => {
        throw new Error('500 internal_server_error');
      },
      isGeminiConfigured: () => true,
      probeGemini: async () => true,
      ALLOWED_RATIOS: ['1:1', '4:5', '16:9', '9:16'] as const,
      _internal: { isPng: () => false, ALLOWED_RATIOS: [] },
    }));
    const { buildApp } = await import('../src/server.js');
    const app = buildApp();
    const res = await app.request('/image/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'k', ratio: '1:1' }),
    });
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string; userMessage: { why: string } };
    expect(body.error).toBe('SERVER_ERROR');
    expect(body.userMessage.why).toContain('외부 LLM 서버');
  });

  it('returns 503 when generateImage throws a 401 (unauthorized)', async () => {
    vi.doMock('../src/services/gemini.service.js', () => ({
      generateImage: async () => {
        throw new Error('401 invalid api key');
      },
      isGeminiConfigured: () => true,
      probeGemini: async () => true,
      ALLOWED_RATIOS: ['1:1', '4:5', '16:9', '9:16'] as const,
      _internal: { isPng: () => false, ALLOWED_RATIOS: [] },
    }));
    const { buildApp } = await import('../src/server.js');
    const app = buildApp();
    const res = await app.request('/image/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'k', ratio: '1:1' }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('returns 429 when generateImage throws a 429 (rate limited)', async () => {
    vi.doMock('../src/services/gemini.service.js', () => ({
      generateImage: async () => {
        throw new Error('429 rate limit exceeded');
      },
      isGeminiConfigured: () => true,
      probeGemini: async () => true,
      ALLOWED_RATIOS: ['1:1', '4:5', '16:9', '9:16'] as const,
      _internal: { isPng: () => false, ALLOWED_RATIOS: [] },
    }));
    const { buildApp } = await import('../src/server.js');
    const app = buildApp();
    const res = await app.request('/image/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'k', ratio: '1:1' }),
    });
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string; userMessage: { why: string } };
    expect(body.error).toBe('RATE_LIMITED');
    expect(body.userMessage.why).toContain('한도');
  });

  it('returns 200 with image when generateImage succeeds', async () => {
    vi.doMock('../src/services/gemini.service.js', () => ({
      generateImage: async () => ({
        ok: true,
        variants: [{ base64: 'aGVsbG8=', aspectRatio: '1:1' as const }],
        via: 'gemini' as const,
      }),
      isGeminiConfigured: () => true,
      probeGemini: async () => true,
      ALLOWED_RATIOS: ['1:1', '4:5', '16:9', '9:16'] as const,
      _internal: { isPng: () => true, ALLOWED_RATIOS: [] },
    }));
    const { buildApp } = await import('../src/server.js');
    const app = buildApp();
    const res = await app.request('/image/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'k', ratio: '1:1' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; via: string; variants: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.via).toBe('gemini');
    expect(body.variants).toHaveLength(1);
  });

  it('returns 502 with non-missing message (server-side gemini failure path)', async () => {
    vi.doMock('../src/services/gemini.service.js', () => ({
      generateImage: async () => ({
        ok: false,
        variants: [],
        via: 'mock' as const,
        message: 'gemini_call_failed: model overloaded',
      }),
      isGeminiConfigured: () => true,
      probeGemini: async () => true,
      ALLOWED_RATIOS: ['1:1', '4:5', '16:9', '9:16'] as const,
      _internal: { isPng: () => false, ALLOWED_RATIOS: [] },
    }));
    const { buildApp } = await import('../src/server.js');
    const app = buildApp();
    const res = await app.request('/image/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'k', ratio: '1:1' }),
    });
    expect(res.status).toBe(502);
    const body = (await res.json()) as { userMessage: { why: string } };
    expect(body.userMessage.why).toContain('외부 LLM 서버');
  });
});

// ---------------------------------------------------------------------------
// content route — full errorCodeFor branch matrix
// ---------------------------------------------------------------------------

describe('content route — errorCodeFor branches (Cycle 3 B3)', () => {
  it.each([
    ['401 unauthorized', 'UNAUTHORIZED', 503],
    ['429 rate_limit_exceeded', 'RATE_LIMITED', 429],
    ['Breaker is open', 'CIRCUIT_OPEN', 503],
    ['NO_LLM_BACKEND', 'NO_LLM_BACKEND', 503],
    ['ECONNREFUSED', 'NETWORK_ERROR', 502],
    ['500 internal_server_error', 'SERVER_ERROR', 502],
    ['weird untyped error', 'CONTENT_GEN_FAILED', 502],
  ] as const)('error="%s" → code=%s + status=%s', async (msg, code, status) => {
    vi.doMock('../src/services/content.service.js', () => ({
      generateContent: async () => {
        throw new Error(msg);
      },
    }));
    const { buildApp } = await import('../src/server.js');
    const app = buildApp();
    const res = await app.request('/content/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic: 'x', slideCount: 3 }),
    });
    expect(res.status).toBe(status);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe(code);
  });
});

// ---------------------------------------------------------------------------
// gemini.service.ts runScript — exit code branches
// ---------------------------------------------------------------------------

describe('gemini.service runScript branches (Cycle 3 B3)', () => {
  it('rejects unsupported ratio at the service boundary (defense in depth)', async () => {
    process.env.GEMINI_API_KEY = 'AIza-fake';
    _resetEnvForTests();
    const { generateImage } = await import('../src/services/gemini.service.js');
    const result = await generateImage({
      prompt: 'k',
      // @ts-expect-error — intentionally invalid for the test
      ratio: '21:9',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('invalid_aspect_ratio');
  });

  it('exit code 3 (config) → mapped to gemini_config_error message', async () => {
    process.env.GEMINI_API_KEY = 'AIza-fake';
    _resetEnvForTests();
    vi.doMock('execa', () => ({
      execa: async () => ({
        exitCode: 3,
        stderr: 'x',
        stdout: '',
      }),
    }));
    const { generateImage } = await import('../src/services/gemini.service.js');
    const result = await generateImage({ prompt: 'k', ratio: '1:1' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('config_error');
  });

  it('exit code 2 (recoverable) → stderr passthrough', async () => {
    process.env.GEMINI_API_KEY = 'AIza-fake';
    _resetEnvForTests();
    vi.doMock('execa', () => ({
      execa: async () => ({
        exitCode: 2,
        stderr: 'gemini_call_failed: model overloaded',
        stdout: '',
      }),
    }));
    const { generateImage } = await import('../src/services/gemini.service.js');
    const result = await generateImage({ prompt: 'k', ratio: '4:5' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('overloaded');
  });

  it('exit code 0 + non-PNG bytes → image_corrupt', async () => {
    process.env.GEMINI_API_KEY = 'AIza-fake';
    _resetEnvForTests();
    vi.doMock('execa', () => ({
      execa: async () => ({
        exitCode: 0,
        stderr: '',
        stdout: '',
      }),
    }));
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return {
        ...actual,
        readFile: async () => Buffer.from('not a png'),
        unlink: async () => undefined,
      };
    });
    const { generateImage } = await import('../src/services/gemini.service.js');
    const result = await generateImage({ prompt: 'k', ratio: '16:9' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('image_corrupt');
    vi.doUnmock('node:fs/promises');
  });

  it('exit code 0 + PNG bytes < 256B → image_too_small', async () => {
    process.env.GEMINI_API_KEY = 'AIza-fake';
    _resetEnvForTests();
    vi.doMock('execa', () => ({
      execa: async () => ({ exitCode: 0, stderr: '', stdout: '' }),
    }));
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      const tiny = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.alloc(40),
      ]);
      return {
        ...actual,
        readFile: async () => tiny,
        unlink: async () => undefined,
      };
    });
    const { generateImage } = await import('../src/services/gemini.service.js');
    const result = await generateImage({ prompt: 'k', ratio: '9:16' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('image_too_small');
    vi.doUnmock('node:fs/promises');
  });
});
