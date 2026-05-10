// tests/cycle-3-fix-regression.test.ts — pin every Cycle 3 Fix on regression.
//   F2 (P2-1): empty signature first element no longer injects bare dash.
//   F3 (P2-3): unknown-class echo masks email / JWT / phone PII.
//   F4 (P2-2): classifier text fallback uses anchored matches (no false-positive
//              on user content that happens to contain "401" / "quota" etc.).
//   F5 (P3-6): uv venv-init stderr noise is stripped from gemini.service messages.

import { describe, it, expect } from 'vitest';
import { applyForbiddenAndSignature } from '../src/lib/caption-rules.js';
import {
  classifyError,
  mapErrorToKoreanUserMessage,
  sanitizeErrorMessage,
} from '../src/lib/sanitize-error.js';
import { _internal } from '../src/services/gemini.service.js';

// ---------------------------------------------------------------------------
// F2 (P2-1) — applyForbiddenAndSignature signature first-element empty
// ---------------------------------------------------------------------------

describe('Cycle 3 Fix F2 (P2-1) — signature first-empty inject', () => {
  it('skips empty first signature, picks first non-empty (no bare dash injection)', () => {
    const result = applyForbiddenAndSignature('hello world', [], ['', '진짜시그']);
    expect(result.signatureInjected).toBe('진짜시그');
    expect(result.caption).toContain('— 진짜시그');
    // Ensure we never injected the empty placeholder.
    expect(result.caption).not.toMatch(/—\s*$/);
  });

  it('skips whitespace-only signature too', () => {
    const result = applyForbiddenAndSignature('hello', [], ['   ', '\n\n', 'real-sig']);
    expect(result.signatureInjected).toBe('real-sig');
    expect(result.caption).toContain('— real-sig');
  });

  it('returns signatureInjected=null when ALL signatures are empty', () => {
    const result = applyForbiddenAndSignature('hello', [], ['', '   ', '\n']);
    expect(result.signatureInjected).toBeNull();
    // No bare dash injection.
    expect(result.caption).not.toContain('— ');
  });

  it('still skips inject when caller-passed first-non-empty signature already present', () => {
    const result = applyForbiddenAndSignature('hello with realsig inside', [], ['', 'realsig']);
    expect(result.signatureInjected).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// F3 (P2-3) — unknown-class PII echo
// ---------------------------------------------------------------------------

describe('Cycle 3 Fix F3 (P2-3) — unknown class PII masking', () => {
  it('masks email addresses inside vendor error echoes', () => {
    const out = sanitizeErrorMessage('upstream complained about user alice@example.com today');
    expect(out).not.toContain('alice@example.com');
    expect(out).toContain('[email]');
  });

  it('masks JWT tokens (eyJ... three-segment base64url)', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.s1gn4tur3-bytes-here_long';
    const out = sanitizeErrorMessage(`bad token ${jwt} provided`);
    expect(out).not.toContain('eyJhbGciOiJIUzI1NiIs');
    expect(out).toContain('[jwt]');
  });

  it('masks E.164 phone numbers', () => {
    const out = sanitizeErrorMessage('contact +14155551234 for support');
    expect(out).not.toContain('+14155551234');
    expect(out).toContain('[phone]');
  });

  it('masks Korean cell phone formats', () => {
    expect(sanitizeErrorMessage('call 010-1234-5678 right now')).toContain('[phone]');
    expect(sanitizeErrorMessage('010 1234 5678 from KR')).toContain('[phone]');
    expect(sanitizeErrorMessage('01012345678 raw form')).toContain('[phone]');
  });

  it('unknown-class userMessage drops the (원문) echo when PII markers remain', () => {
    const msg = mapErrorToKoreanUserMessage(new Error('weird error from alice@x.com user'), {
      what: 'X',
    });
    // Echo cap drops anything still containing [email] / [phone] / [jwt] markers
    // — Korean lead remains intact.
    expect(msg.why).not.toContain('[email]');
    expect(msg.why).not.toContain('alice@x.com');
    expect(msg.why).toContain('알 수 없는 오류가 발생했습니다');
  });

  it('benign English-only message still echoes (capped at 120 chars)', () => {
    const msg = mapErrorToKoreanUserMessage(new Error('connection reset by peer (status 999)'), {
      what: 'X',
    });
    expect(msg.why).toContain('알 수 없는 오류가 발생했습니다');
    expect(msg.why).toContain('원문:');
    expect(msg.why).toContain('connection reset by peer');
  });
});

// ---------------------------------------------------------------------------
// F4 (P2-2) — classifier text fallback false-positive avoidance
// ---------------------------------------------------------------------------

describe('Cycle 3 Fix F4 (P2-2) — text-fallback word-boundary precision', () => {
  it('does NOT classify user-content "401" mentions as unauthorized', () => {
    expect(classifyError(new Error('this is line 401 of the document'))).toBe('unknown');
    expect(classifyError(new Error('product price was 401 dollars'))).toBe('unknown');
  });

  it('still classifies leading "401 Unauthorized" as unauthorized', () => {
    expect(classifyError(new Error('401 Unauthorized'))).toBe('unauthorized');
    expect(classifyError(new Error('HTTP 401 returned from upstream'))).toBe('unauthorized');
    expect(classifyError(new Error('401 invalid api key sk-ant-fake'))).toBe('unauthorized');
  });

  it('does NOT classify random "quota" mentions as rate_limited unless paired with limit verb', () => {
    expect(classifyError(new Error('the school quota board met today'))).toBe('unknown');
    expect(classifyError(new Error('quota exceeded'))).toBe('rate_limited');
    expect(classifyError(new Error('quota limit reached'))).toBe('rate_limited');
  });

  it('does NOT classify random "aborted" mentions as network unless paired with subject', () => {
    expect(classifyError(new Error('the meeting was aborted by the chair'))).toBe('unknown');
    expect(classifyError(new Error('request aborted'))).toBe('network');
    expect(classifyError(new Error('connection aborted'))).toBe('network');
  });

  it('still classifies leading 5xx digits + HTTP context as server_error', () => {
    expect(classifyError(new Error('500 internal_server_error'))).toBe('server_error');
    expect(classifyError(new Error('502 bad gateway'))).toBe('server_error');
    expect(classifyError(new Error('HTTP 503 unavailable'))).toBe('server_error');
  });

  it('does NOT classify random user content with "500" as server_error', () => {
    expect(classifyError(new Error('priced at 500 dollars per unit'))).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// F5 (P3-6) — uv venv-init noise stripping
// ---------------------------------------------------------------------------

describe('Cycle 3 Fix F5 (P3-6) — strip uv venv-init noise from stderr', () => {
  it('strips "Using CPython" / "Creating virtual environment" / "Downloading" / "Installed" lines', () => {
    const noisy = [
      'Using CPython 3.10.13',
      'Creating virtual environment at /root/.venv',
      'Downloading google-genai (1.2.3)',
      ' Downloaded pydantic-core',
      ' Downloaded cryptography',
      ' Downloaded pillow',
      'Installed 5 packages in 2.3s',
      'Resolved 30 packages in 1.5s',
      'Audited 1 package in 0.05s',
      'Real error: gemini_call_failed: model overloaded',
    ].join('\n');
    const cleaned = _internal.stripUvVenvNoise(noisy);
    expect(cleaned).toContain('gemini_call_failed: model overloaded');
    expect(cleaned).not.toContain('Using CPython');
    expect(cleaned).not.toContain('Creating virtual environment');
    expect(cleaned).not.toContain('Downloading');
    expect(cleaned).not.toContain('Downloaded');
    expect(cleaned).not.toContain('Installed 5');
    expect(cleaned).not.toContain('Resolved 30');
  });

  it('returns empty string when stderr is ONLY uv noise', () => {
    const noisy = [
      'Using CPython 3.10.13',
      'Creating virtual environment',
      'Installed 1 package in 1s',
    ].join('\n');
    const cleaned = _internal.stripUvVenvNoise(noisy);
    expect(cleaned).toBe('');
  });

  it('preserves real Python tracebacks and error markers', () => {
    const real = 'Traceback (most recent call last):\n  File "x.py", line 1\nValueError: bad value';
    expect(_internal.stripUvVenvNoise(real)).toBe(real.trim());
  });

  it('handles empty / undefined stderr gracefully', () => {
    expect(_internal.stripUvVenvNoise('')).toBe('');
  });
});
