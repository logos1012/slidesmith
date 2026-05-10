// tests/health.test.ts — Cycle 2 acceptance: GET /health real ping + breaker state.

import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../src/server.js';
import { _resetEnvForTests } from '../src/lib/env.js';
import { _resetFailureBoundaries } from '../src/lib/failure-boundary.js';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GEMINI_API_KEY;
  _resetEnvForTests();
  _resetFailureBoundaries();
});

describe('GET /health', () => {
  it('returns 200 with the documented shape (claude/anthropic/gemini + breakers)', async () => {
    const app = buildApp();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expect(body.status).toBe('ok');
    expect(body.service).toBe('slidesmith-llm');
    expect(typeof body.uptime).toBe('number');

    const claude = body.claude as {
      available: unknown;
      pool: { size: number };
      breaker: { state: string };
    };
    expect(typeof claude.available).toBe('boolean');
    expect(claude.pool.size).toBe(1);
    expect(['open', 'halfOpen', 'closed']).toContain(claude.breaker.state);

    const anthropic = body.anthropic as { available: boolean; breaker: { state: string } };
    expect(anthropic.available).toBe(false);
    expect(['open', 'halfOpen', 'closed']).toContain(anthropic.breaker.state);

    const gemini = body.gemini as { available: boolean; configured: boolean };
    expect(gemini.available).toBe(false);
    expect(gemini.configured).toBe(false);
  });

  it('returns 404 for unknown routes', async () => {
    const app = buildApp();
    const res = await app.request('/does-not-exist');
    expect(res.status).toBe(404);
  });
});
