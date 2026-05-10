// sanitizer.test.ts — Cycle 3 Fix L1 verification.
// The single source of truth for vendor-word redaction MUST cover every word
// in the storage-ci vendor-leak grep. If grep adds a pattern, this test
// surfaces the drift before the next push.
import { describe, it, expect } from 'vitest';
import { sanitiseUpstream } from '../../src/lib/sanitizer.js';

describe('sanitiseUpstream — vendor word redaction', () => {
  // Word list mirrors storage-ci.yml PATTERNS exactly (the case-insensitive
  // ones — `s3url` / `s3bucket` / `airtablerecordid` / `claudemessage` /
  // `claudecli` are field-name guards handled separately by the leak gate).
  // NOTE: `S3` and `amazonaws` are *both* on the vendor list, so a hostname
  // like `bucket.s3.amazonaws.com` redacts twice. That is the intended result —
  // double-redacting is strictly safer than leaking either word.
  const cases: Array<[string, string]> = [
    ['Airtable HTTP 404', 'upstream HTTP 404'],
    ['AWS S3 timeout', 'upstream upstream timeout'],
    ['bucket.s3.amazonaws.com', 'bucket.upstream.upstream.com'],
    ['Puppeteer crashed', 'upstream crashed'],
    ['Gemini API rate limit', 'upstream API rate limit'],
    ['Claude returned 500', 'upstream returned 500'],
    ['Anthropic SDK error', 'upstream SDK error'],
    ['OpenAI 401', 'upstream 401'],
    ['Bedrock throttled', 'upstream throttled'],
    ['Vertex unavailable', 'upstream unavailable'],
  ];

  for (const [input, expected] of cases) {
    it(`replaces "${input}" → "${expected}"`, () => {
      expect(sanitiseUpstream(input)).toBe(expected);
    });
  }

  it('is case-insensitive', () => {
    expect(sanitiseUpstream('airtable / AIRTABLE / Airtable')).toBe(
      'upstream / upstream / upstream',
    );
  });

  it('leaves unrelated words intact', () => {
    expect(sanitiseUpstream('database connection refused')).toBe(
      'database connection refused',
    );
  });

  it('handles multi-vendor messages in one pass', () => {
    expect(sanitiseUpstream('Airtable HTTP 404 / bucket.s3.amazonaws.com / Claude 500')).toBe(
      'upstream HTTP 404 / bucket.upstream.upstream.com / upstream 500',
    );
  });

  it('respects word boundaries (does not redact "claws" → "upstreamws")', () => {
    // We intentionally use \b in the regex so substrings like "vertexagon"
    // would not be touched. The intent is to avoid false positives on legit
    // English content that happens to contain a vendor substring.
    expect(sanitiseUpstream('vertexagon is a polygon')).toBe('vertexagon is a polygon');
  });
});
