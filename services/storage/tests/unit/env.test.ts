// env.test.ts — placeholder rejection in production + cache + happy paths.
// Production startup must NOT silently boot with `pat-placeholder` while reporting
// `airtable.available: true` (Cycle 1 Review Medium-1 / fix §11).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadEnv, _resetEnv } from '../../src/lib/env.js';

const REQUIRED_PROD_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  AIRTABLE_PAT: 'patRealKeyXXXXXXXXXXXX',
  AIRTABLE_BASE_ID: 'appRealBaseXXXX',
  AWS_ACCESS_KEY_ID: 'AKIAREAL12345',
  AWS_SECRET_ACCESS_KEY: 'real-secret-XXXX',
};

describe('loadEnv', () => {
  beforeEach(() => _resetEnv());

  it('returns defaults in development with placeholder credentials', () => {
    const env = loadEnv({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    expect(env.PORT).toBe(3003);
    expect(env.AIRTABLE_PAT).toBe('pat-placeholder');
    expect(env.NODE_ENV).toBe('development');
  });

  it('caches the parsed env (second call returns same reference)', () => {
    const a = loadEnv({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    const b = loadEnv();
    expect(a).toBe(b);
  });

  it('rejects placeholder AIRTABLE_PAT in production', () => {
    expect(() =>
      loadEnv({
        ...REQUIRED_PROD_ENV,
        AIRTABLE_PAT: 'pat-dummy-1',
      } as NodeJS.ProcessEnv),
    ).toThrow(/placeholder credential not allowed/);
  });

  it('rejects placeholder AIRTABLE_BASE_ID in production', () => {
    expect(() =>
      loadEnv({
        ...REQUIRED_PROD_ENV,
        AIRTABLE_BASE_ID: 'app-placeholder',
      } as NodeJS.ProcessEnv),
    ).toThrow(/placeholder credential not allowed/);
  });

  it('rejects placeholder AWS_ACCESS_KEY_ID in production', () => {
    expect(() =>
      loadEnv({
        ...REQUIRED_PROD_ENV,
        AWS_ACCESS_KEY_ID: 'AKIA-placeholder',
      } as NodeJS.ProcessEnv),
    ).toThrow(/placeholder credential not allowed/);
  });

  it('accepts real-looking credentials in production', () => {
    const env = loadEnv(REQUIRED_PROD_ENV);
    expect(env.NODE_ENV).toBe('production');
    expect(env.AIRTABLE_PAT).toBe('patRealKeyXXXXXXXXXXXX');
  });

  it('parses bulkhead overrides', () => {
    const env = loadEnv({
      NODE_ENV: 'development',
      AIRTABLE_BULKHEAD: '7',
      S3_BULKHEAD: '12',
      IDEMPOTENCY_TTL_MS: '120000',
    } as NodeJS.ProcessEnv);
    expect(env.AIRTABLE_BULKHEAD).toBe(7);
    expect(env.S3_BULKHEAD).toBe(12);
    expect(env.IDEMPOTENCY_TTL_MS).toBe(120_000);
  });

  it('throws a condensed Invalid environment error on bad input', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'development',
        PORT: 'not-a-number',
      } as NodeJS.ProcessEnv),
    ).toThrow(/Invalid environment/);
  });
});
