// tests/gemini-service.test.ts — Gemini wrapper mock-fallback path
// (no API key → ok:false, via:'mock').

import { describe, it, expect, beforeEach } from 'vitest';
import { _resetEnvForTests } from '../src/lib/env.js';
import { _resetFailureBoundaries } from '../src/lib/failure-boundary.js';
import {
  generateImage,
  isGeminiConfigured,
  probeGemini,
} from '../src/services/gemini.service.js';

beforeEach(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  delete process.env.GEMINI_API_KEY;
  _resetEnvForTests();
  _resetFailureBoundaries();
});

describe('gemini.service', () => {
  it('isGeminiConfigured returns false without GEMINI_API_KEY', () => {
    expect(isGeminiConfigured()).toBe(false);
  });

  it('probeGemini returns false without key', async () => {
    expect(await probeGemini()).toBe(false);
  });

  it('generateImage returns ok:false + mock when key missing', async () => {
    const result = await generateImage({ prompt: 'x', ratio: '1:1' });
    expect(result.ok).toBe(false);
    expect(result.via).toBe('mock');
    expect(result.message).toContain('GEMINI_API_KEY');
  });
});
