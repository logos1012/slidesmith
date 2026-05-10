// src/services/claude.service.ts — Claude CLI subprocess + Anthropic SDK fallback.
// SPEC: SERVICE-llm.md §5-2, §6, §7.
// streamClaude() is the single entry: tries CLI through bulkhead + breaker,
// falls back to Anthropic SDK on failure.

import { execa } from 'execa';
import { detectClaudeCli, getPoolStatus, withClaudeBoundary } from '../lib/claude-pool.js';
import {
  withBreaker,
  withBulkhead,
  getBreakerState,
  type BreakerState,
} from '../lib/failure-boundary.js';
import { streamAnthropic, isAnthropicConfigured } from './anthropic-sdk.service.js';
import { logger } from '../lib/logger.js';

export interface ClaudeAvailability {
  available: boolean;
  cliPath: string | null;
  pool: { size: number; pending: number; active: number };
  lastSuccessAt: string | null;
  breaker: BreakerState;
}

export interface StreamUsage {
  input_tokens: number;
  output_tokens: number;
}

let lastSuccessAt: string | null = null;

export async function getClaudeAvailability(): Promise<ClaudeAvailability> {
  const cliPath = await detectClaudeCli();
  const pool = await getPoolStatus();
  return {
    available: cliPath !== null,
    cliPath,
    pool,
    lastSuccessAt,
    breaker: getBreakerState('claude-cli'),
  };
}

interface StreamJsonLine {
  type?: string;
  message?: { content?: Array<{ type: string; text?: string }>; usage?: StreamUsage };
  delta?: { type?: string; text?: string };
  usage?: StreamUsage;
}

/** Parse a single stream-json line from Claude CLI. Returns delta token if present. */
function parseStreamLine(line: string): { token?: string; usage?: StreamUsage } {
  const trimmed = line.trim();
  if (!trimmed) return {};
  try {
    const obj = JSON.parse(trimmed) as StreamJsonLine;
    if (obj.delta?.text) return { token: obj.delta.text };
    if (obj.type === 'content_block_delta' && obj.delta?.text) return { token: obj.delta.text };
    if (obj.usage) return { usage: obj.usage };
    if (obj.message?.usage) return { usage: obj.message.usage };
    return {};
  } catch {
    return {};
  }
}

async function streamViaCli(
  systemPrompt: string,
  userPrompt: string,
  onToken: (token: string) => void,
  signal: AbortSignal,
): Promise<{ text: string; usage: StreamUsage | null }> {
  const cliPath = await detectClaudeCli();
  if (!cliPath) throw new Error('CLAUDE_CLI_UNAVAILABLE');
  const child = execa(
    cliPath,
    ['-p', '--system-prompt', systemPrompt, '--output-format', 'stream-json'],
    { input: userPrompt, buffer: false, cancelSignal: signal, reject: true },
  );
  let fullText = '';
  let usage: StreamUsage | null = null;
  let buffer = '';
  child.stdout?.setEncoding('utf8');
  for await (const chunk of child.stdout ?? []) {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const parsed = parseStreamLine(line);
      if (parsed.token) {
        fullText += parsed.token;
        onToken(parsed.token);
      }
      if (parsed.usage) usage = parsed.usage;
    }
  }
  await child;
  return { text: fullText, usage };
}

/** Public entry: stream Claude reply with token callback. CLI first, SDK fallback. */
export async function streamClaude(
  systemPrompt: string,
  userPrompt: string,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string; usage: StreamUsage | null; via: 'cli' | 'sdk' }> {
  const ac = signal ?? new AbortController().signal;
  const cliPath = await detectClaudeCli();
  if (cliPath) {
    try {
      const result = await withBreaker('claude-cli', () =>
        withClaudeBoundary(() => streamViaCli(systemPrompt, userPrompt, onToken, ac)),
      );
      lastSuccessAt = new Date().toISOString();
      return { ...result, via: 'cli' };
    } catch (err) {
      logger.warn({ err: String(err) }, 'claude_cli_failed_fallback_sdk');
    }
  }
  if (!isAnthropicConfigured()) throw new Error('NO_LLM_BACKEND');
  // Cycle 2 Fix F5: SDK fallback path also goes through a size-1 bulkhead
  // (SPEC §7 Anthropic SDK row). Otherwise concurrent requests bypass the
  // single-flight guarantee and Anthropic rate limits get hit harder.
  const sdk = await withBreaker('anthropic-sdk', () =>
    withBulkhead('anthropic-sdk', 1, () => streamAnthropic(systemPrompt, userPrompt, onToken)),
  );
  lastSuccessAt = new Date().toISOString();
  return { ...sdk, via: 'sdk' };
}

export function _markClaudeSuccess(at: Date = new Date()): void {
  lastSuccessAt = at.toISOString();
}
