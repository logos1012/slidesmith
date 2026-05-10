// tests/anthropic-sdk.test.ts — SDK wrapper guard paths.

import { describe, it, expect, beforeEach } from 'vitest';
import { _resetEnvForTests } from '../src/lib/env.js';
import {
  isAnthropicConfigured,
  completeAnthropic,
  streamAnthropic,
  _resetAnthropicClient,
} from '../src/services/anthropic-sdk.service.js';

beforeEach(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  delete process.env.ANTHROPIC_API_KEY;
  _resetEnvForTests();
  _resetAnthropicClient();
});

describe('anthropic-sdk.service', () => {
  it('isAnthropicConfigured false without key', () => {
    expect(isAnthropicConfigured()).toBe(false);
  });

  it('completeAnthropic throws when key missing', async () => {
    await expect(completeAnthropic('s', 'u')).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it('streamAnthropic throws when key missing', async () => {
    await expect(streamAnthropic('s', 'u', () => undefined)).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it('isAnthropicConfigured true when key present', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    _resetEnvForTests();
    _resetAnthropicClient();
    expect(isAnthropicConfigured()).toBe(true);
  });
});
