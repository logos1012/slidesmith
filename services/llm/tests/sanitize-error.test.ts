// tests/sanitize-error.test.ts — Cycle 2 Fix P1-1.
// Every vendor API key prefix that could leak through a raw error message
// must be masked before reaching the user. This test pins the regex coverage
// for: Anthropic (sk-ant-*), generic OpenAI-style sk-*, Google (AIza*),
// HTTP Bearer tokens, and x-api-key header echoes.

import { describe, it, expect } from 'vitest';
import {
  sanitizeErrorMessage,
  sanitizeUnknownError,
} from '../src/lib/sanitize-error.js';

describe('sanitizeErrorMessage', () => {
  it('masks Anthropic sk-ant-* keys', () => {
    const input =
      '401 invalid x-api-key sk-ant-api03-AbCd1234EfGhIjKlMnOpQrStUv-XYZ_more';
    const out = sanitizeErrorMessage(input);
    expect(out).not.toMatch(/sk-ant-api03/);
    expect(out).toContain('sk-ant-***');
  });

  it('masks Anthropic sk-ant-* even inside JSON-like vendor response', () => {
    const input =
      '{"type":"error","error":{"message":"invalid x-api-key sk-ant-api03-XyZAbC123_long-token"}}';
    const out = sanitizeErrorMessage(input);
    expect(out).not.toContain('sk-ant-api03');
    expect(out).toContain('sk-ant-***');
  });

  it('masks generic sk-* (OpenAI/proj/test) keys', () => {
    const cases = [
      'auth failed for sk-proj-AbCdEfGhIjKlMnOp1234',
      'sk-test-1234567890abcdefABCDEF rejected',
      'sk-or-v1-abcDEF1234567890longLongLong',
    ];
    for (const input of cases) {
      const out = sanitizeErrorMessage(input);
      expect(out).toContain('sk-***');
      expect(out).not.toMatch(/sk-(proj|test|or)-[A-Za-z0-9]{8,}/);
    }
  });

  it('does not double-mask sk-ant-* as generic sk-*', () => {
    // sk-ant- branch must run first; ensure final string contains exactly
    // "sk-ant-***" (not "sk-***-***" or similar).
    const out = sanitizeErrorMessage('key sk-ant-api03-LONG_KEY_HERE_xyz');
    expect(out).toContain('sk-ant-***');
    expect(out).not.toContain('sk-***-');
  });

  it('masks Google AIza* keys', () => {
    const input = 'gemini error AIzaSyAbCdEfGh1234567890_xyz-LONG';
    const out = sanitizeErrorMessage(input);
    expect(out).toContain('AIza-***');
    expect(out).not.toContain('AIzaSy');
  });

  it('masks HTTP Bearer tokens', () => {
    const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig';
    const out = sanitizeErrorMessage(input);
    expect(out).toContain('Bearer ***');
    expect(out).not.toContain('eyJhbGciOiJIUzI1NiIs');
  });

  it('masks x-api-key header echoes (any case + quoting)', () => {
    expect(sanitizeErrorMessage('header x-api-key: sk-ant-api03-something_long')).toContain('***');
    expect(sanitizeErrorMessage('"X-Api-Key":"abcdef1234567890token"')).toContain('***');
  });

  it('leaves benign messages unchanged', () => {
    const benign = 'connection reset by peer (status 502)';
    expect(sanitizeErrorMessage(benign)).toBe(benign);
  });

  it('handles empty / undefined gracefully', () => {
    expect(sanitizeErrorMessage('')).toBe('');
  });

  it('sanitizeUnknownError extracts message off Error and masks', () => {
    const err = new Error('rejected for sk-ant-api03-abc123def456ghi789jkl');
    const out = sanitizeUnknownError(err);
    expect(out).toContain('sk-ant-***');
    expect(out).not.toContain('sk-ant-api03-abc');
  });

  it('sanitizeUnknownError stringifies non-Error values', () => {
    expect(sanitizeUnknownError({ msg: 'not-error' })).toBe('[object Object]');
    expect(sanitizeUnknownError('plain sk-ant-api03-XYZabc1234567890')).toContain('sk-ant-***');
  });

  it('masks multiple distinct prefixes in one message', () => {
    const input =
      'first sk-ant-api03-AAAAAAAAAAAA then AIzaSyBBBBBBBBBBBBBBBBBB and Bearer CCCCCCC.DDDDDDD.EEEEEEE';
    const out = sanitizeErrorMessage(input);
    expect(out).toContain('sk-ant-***');
    expect(out).toContain('AIza-***');
    expect(out).toContain('Bearer ***');
  });
});
