// src/services/anthropic-sdk.service.ts — Anthropic SDK fallback path.
// SPEC: SERVICE-llm.md §6, §7. Used when Claude CLI subprocess fails or is absent.

import Anthropic from '@anthropic-ai/sdk';
import { loadEnv } from '../lib/env.js';
import { logger } from '../lib/logger.js';

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (client) return client;
  const env = loadEnv();
  if (!env.ANTHROPIC_API_KEY) return null;
  client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 4096;

export interface SdkUsage {
  input_tokens: number;
  output_tokens: number;
}

/** One-shot completion (non-streaming). Returns full text + usage. */
export async function completeAnthropic(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; usage: SdkUsage }> {
  const c = getClient();
  if (!c) throw new Error('ANTHROPIC_API_KEY not configured');
  const res = await c.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return {
    text,
    usage: { input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens },
  };
}

/** Streaming completion. Calls onToken for every text delta. */
export async function streamAnthropic(
  systemPrompt: string,
  userPrompt: string,
  onToken: (token: string) => void,
): Promise<{ text: string; usage: SdkUsage | null }> {
  const c = getClient();
  if (!c) throw new Error('ANTHROPIC_API_KEY not configured');
  let fullText = '';
  let usage: SdkUsage | null = null;
  const stream = c.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  stream.on('text', (delta: string) => {
    fullText += delta;
    onToken(delta);
  });
  const final = await stream.finalMessage();
  usage = { input_tokens: final.usage.input_tokens, output_tokens: final.usage.output_tokens };
  return { text: fullText, usage };
}

/** Lightweight reachability probe for /health. Returns true if API key is present. */
export function isAnthropicConfigured(): boolean {
  return getClient() !== null;
}

/** Test-only: clear the singleton. */
export function _resetAnthropicClient(): void {
  client = null;
}

export const _internal = { logger };
