// src/services/content.service.ts — orchestrates Claude → slide JSON.
// SPEC: SERVICE-llm.md §5-3.

import { completeAnthropic, isAnthropicConfigured } from './anthropic-sdk.service.js';
import { withBreaker, withBulkhead } from '../lib/failure-boundary.js';
import {
  buildContentSystemPrompt,
  buildContentUserPrompt,
  type ContentPromptInput,
} from '../lib/prompts/content.js';
import { logger } from '../lib/logger.js';

export interface SlideOut {
  title: string;
  body: string;
  caption: string;
}
export interface ContentResult {
  slides: SlideOut[];
  metadata: { model: string; inputTokens: number; outputTokens: number; via: 'sdk' | 'mock' };
}

function parseSlidesJson(raw: string): SlideOut[] {
  // Claude sometimes wraps JSON in code fences; strip them.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const obj = JSON.parse(cleaned) as { slides?: unknown };
  if (!Array.isArray(obj.slides)) throw new Error('content.service: missing slides array');
  return obj.slides.map((s): SlideOut => {
    const slide = s as Partial<SlideOut>;
    return {
      title: String(slide.title ?? '').slice(0, 60),
      body: String(slide.body ?? '').slice(0, 240),
      caption: String(slide.caption ?? '').slice(0, 120),
    };
  });
}

function mockSlides(input: ContentPromptInput): SlideOut[] {
  return Array.from({ length: input.slideCount }, (_, i) => ({
    title: `${input.topic} — ${i + 1}`,
    body: `샘플 본문 ${i + 1}. 실제 Claude 응답으로 대체됩니다.`,
    caption: `슬라이드 ${i + 1} 캡션`,
  }));
}

export async function generateContent(input: ContentPromptInput): Promise<ContentResult> {
  if (!isAnthropicConfigured()) {
    logger.warn('content.service: ANTHROPIC_API_KEY missing — returning mock');
    return {
      slides: mockSlides(input),
      metadata: { model: 'mock', inputTokens: 0, outputTokens: 0, via: 'mock' },
    };
  }
  const systemPrompt = buildContentSystemPrompt(input.language ?? 'ko');
  const userPrompt = buildContentUserPrompt(input);
  // Cycle 2 Fix F5: also enforce size-1 bulkhead on SDK path (SPEC §7).
  const { text, usage } = await withBreaker('anthropic-sdk', () =>
    withBulkhead('anthropic-sdk', 1, () => completeAnthropic(systemPrompt, userPrompt)),
  );
  return {
    slides: parseSlidesJson(text),
    metadata: {
      model: 'claude-sonnet-4-5',
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      via: 'sdk',
    },
  };
}

export const _internal = { parseSlidesJson, mockSlides };
