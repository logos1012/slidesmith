// tests/prompts.test.ts — content prompt builder.

import { describe, it, expect } from 'vitest';
import {
  buildContentSystemPrompt,
  buildContentUserPrompt,
} from '../src/lib/prompts/content.js';

describe('content prompts', () => {
  it('system prompt mentions JSON-only output and Korean tone', () => {
    const sys = buildContentSystemPrompt();
    expect(sys).toContain('JSON');
    expect(sys).toContain('한국어');
    expect(sys).toContain('존댓말');
  });

  it('user prompt embeds topic + slideCount + tone + language', () => {
    const u = buildContentUserPrompt({
      topic: '생산성',
      slideCount: 7,
      tone: '진지한 전문가',
      language: 'ko',
    });
    expect(u).toContain('생산성');
    expect(u).toContain('7');
    expect(u).toContain('진지한 전문가');
    expect(u).toContain('한국어');
  });

  it('user prompt defaults tone and falls back to Korean', () => {
    const u = buildContentUserPrompt({ topic: 't', slideCount: 3 });
    expect(u).toContain('친근한 전문가');
    expect(u).toContain('한국어');
  });

  it('user prompt switches to English when requested', () => {
    const u = buildContentUserPrompt({ topic: 't', slideCount: 3, language: 'en' });
    // Cycle 3 C2 — English prompt uses "Topic:" / "Slide count:" header words.
    expect(u).toContain('Topic:');
    expect(u).toContain('Slide count:');
    expect(u).not.toContain('한국어');
  });

  it('Cycle 3 C2 — system prompt switches to English when language=en', () => {
    const sys = buildContentSystemPrompt('en');
    expect(sys).toContain('JSON');
    expect(sys).toContain('Instagram carousel');
    expect(sys).not.toContain('한국어');
  });

  it('Cycle 3 C2 — system prompt mentions hook + CTA discipline (Korean)', () => {
    const sys = buildContentSystemPrompt('ko');
    expect(sys).toContain('훅');
    expect(sys).toContain('CTA');
    expect(sys).toContain('마크다운');
  });

  it('Cycle 3 C2 — Korean user prompt mentions PAS or AIDA framework hint', () => {
    const u = buildContentUserPrompt({ topic: '주제', slideCount: 5 });
    expect(u).toMatch(/PAS|AIDA/);
  });
});
