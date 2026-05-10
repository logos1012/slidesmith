// tests/caption-rules-extended.test.ts — Cycle 3 A2.
// Pin rules #1 (voice/tone), #4 (platform transform), #5 (forbidden retry +
// signature inject) — Cycle 2 only had #2 + #3 covered.

import { describe, it, expect } from 'vitest';
import {
  buildCaption,
  pickHookEmoji,
  formatForPlatform,
  applyForbiddenAndSignature,
  applyCaptionRules,
  distributeHashtags,
} from '../src/lib/caption-rules.js';

// ---------------------------------------------------------------------------
// #1 — brandDSL voice/tone preserve
// ---------------------------------------------------------------------------

describe('#1 brandDSL voice/tone preserve', () => {
  it('pickHookEmoji is deterministic for known voices', () => {
    expect(pickHookEmoji('친근')).toBe('✨');
    expect(pickHookEmoji('전문')).toBe('💡');
    expect(pickHookEmoji('재치')).toBe('👀');
    expect(pickHookEmoji('대담')).toBe('🔥');
    expect(pickHookEmoji('영감')).toBe('🚀');
  });

  it('pickHookEmoji is deterministic (stable) for unknown voices', () => {
    const a = pickHookEmoji('미정의보이스');
    const b = pickHookEmoji('미정의보이스');
    expect(a).toBe(b);
    expect(['✨', '🔥', '💡', '👀', '🚀']).toContain(a);
  });

  it('pickHookEmoji defaults to ✨ when voice is undefined', () => {
    expect(pickHookEmoji(undefined)).toBe('✨');
  });

  it('buildCaption uses voice-mapped hook emoji', () => {
    const caption = buildCaption(
      [{ title: '훅' }, { title: '본문' }, { title: 'CTA' }],
      { voice: '대담' },
    );
    expect(caption.startsWith('🔥')).toBe(true);
  });

  it('tone:formal switches CTA to ~십시오 register', () => {
    const informal = buildCaption(
      [{ title: 'h' }, { title: 'b' }, { title: '확인' }],
      { tone: 'informal' },
    );
    const formal = buildCaption(
      [{ title: 'h' }, { title: 'b' }, { title: '확인' }],
      { tone: 'formal' },
    );
    expect(informal).toContain('👉');
    expect(formal).not.toContain('👉');
    expect(formal).toContain('확인해 주십시오');
  });
});

// ---------------------------------------------------------------------------
// #4 — platform-specific transform
// ---------------------------------------------------------------------------

describe('#4 platform-specific transform', () => {
  const baseCaption = '✨ 훅\n\n1. 본문\n\n👉 CTA';
  const baseHashtags = distributeHashtags(['ai', 'react']);

  it('formatForPlatform returns instagram + linkedin + threads variants', () => {
    const out = formatForPlatform(baseCaption, baseHashtags, 'instagram');
    expect(out.instagram).toBeDefined();
    expect(out.linkedin).toBeDefined();
    expect(Array.isArray(out.threads)).toBe(true);
  });

  it('instagram variant appends hashtags as a tail block', () => {
    const out = formatForPlatform(baseCaption, baseHashtags, 'instagram');
    expect(out.instagram).toContain('✨ 훅');
    expect(out.instagram).toContain('#ai');
    expect(out.instagram.indexOf('#ai')).toBeGreaterThan(out.instagram.indexOf('CTA'));
  });

  it('linkedin variant strips hook emoji and replaces 👉 with →', () => {
    const out = formatForPlatform(baseCaption, baseHashtags, 'linkedin');
    expect(out.linkedin.startsWith('✨')).toBe(false);
    expect(out.linkedin).not.toContain('👉');
    expect(out.linkedin).toContain('→ CTA');
  });

  it('linkedin variant uses paragraph (\\n\\n) between non-empty lines', () => {
    const out = formatForPlatform(baseCaption, baseHashtags, 'linkedin');
    expect(out.linkedin).toMatch(/훅\n\n1\. 본문/);
  });

  it('threads variant chunks at ≤500 chars per element', () => {
    const long = '가'.repeat(2000);
    const out = formatForPlatform(long, baseHashtags, 'threads');
    expect(out.threads.length).toBeGreaterThanOrEqual(2000 / 480);
    for (const chunk of out.threads) {
      expect(chunk.length).toBeLessThanOrEqual(480);
    }
  });

  it('threads variant always appends a hashtag chunk at the end', () => {
    const out = formatForPlatform('짧은', baseHashtags, 'threads');
    expect(out.threads[out.threads.length - 1]).toContain('#ai');
  });
});

// ---------------------------------------------------------------------------
// #5 — forbidden retry + signature injection
// ---------------------------------------------------------------------------

describe('#5 forbidden retry + signature injection', () => {
  it('strips forbidden phrases (case-insensitive) and reports them', () => {
    const out = applyForbiddenAndSignature(
      '안녕하세요 오늘은 좋은 정보입니다',
      ['안녕하세요 오늘은'],
      [],
    );
    expect(out.caption).not.toContain('안녕하세요 오늘은');
    expect(out.forbiddenStripped).toContain('안녕하세요 오늘은');
  });

  it('strips multiple forbidden phrases', () => {
    const out = applyForbiddenAndSignature(
      'A 그리고 B 그리고 C',
      ['A', 'B', 'C'],
      [],
    );
    expect(out.forbiddenStripped).toEqual(['A', 'B', 'C']);
  });

  it('injects signature when none present', () => {
    const out = applyForbiddenAndSignature('짧은 본문', [], ['멋진 시그니처']);
    expect(out.caption).toContain('— 멋진 시그니처');
    expect(out.signatureInjected).toBe('멋진 시그니처');
  });

  it('does NOT inject signature when one already present', () => {
    const out = applyForbiddenAndSignature(
      '본문에 이미 멋진 시그니처가 있어요',
      [],
      ['멋진 시그니처'],
    );
    expect(out.signatureInjected).toBe(null);
  });

  it('escapes regex metachars in forbidden phrases', () => {
    const out = applyForbiddenAndSignature(
      '특수문자 (test) 제거',
      ['(test)'],
      [],
    );
    expect(out.caption).not.toContain('(test)');
  });

  it('truncates result at 2200 chars after injection', () => {
    const out = applyForbiddenAndSignature('x'.repeat(2300), [], ['sig']);
    expect(out.caption.length).toBeLessThanOrEqual(2200);
  });

  it('collapses double-spaces and triple-newlines after stripping', () => {
    const out = applyForbiddenAndSignature(
      '앞   X   뒤',
      ['X'],
      [],
    );
    expect(out.caption).not.toMatch(/ {2,}/);
  });
});

// ---------------------------------------------------------------------------
// applyCaptionRules — full 5-rule pipeline
// ---------------------------------------------------------------------------

describe('applyCaptionRules — 5-rule pipeline', () => {
  it('exposes platformVariants and diagnostic flags', () => {
    const out = applyCaptionRules(
      [{ title: '훅' }, { title: '본문' }, { title: 'CTA' }],
      ['ai'],
      [],
      { voice: '전문', tone: 'informal' },
      'linkedin',
    );
    expect(out.platformVariants.linkedin.length).toBeGreaterThan(0);
    expect(out.platformVariants.instagram.length).toBeGreaterThan(0);
    expect(Array.isArray(out.platformVariants.threads)).toBe(true);
    expect(out.forbiddenStripped).toEqual([]);
    expect(out.signatureInjected).toBe(null);
  });

  it('applies forbidden + signature when brandDsl provides them', () => {
    const out = applyCaptionRules(
      [{ title: '안녕하세요 오늘은' }, { title: 'b' }, { title: 'c' }],
      [],
      [],
      {
        forbiddenPhrases: ['안녕하세요 오늘은'],
        signaturePhrases: ['오직 우리만의 가치'],
      },
    );
    expect(out.forbiddenStripped).toContain('안녕하세요 오늘은');
    expect(out.signatureInjected).toBe('오직 우리만의 가치');
    expect(out.caption).toContain('오직 우리만의 가치');
  });

  it('voice tag changes hook emoji throughout', () => {
    const out = applyCaptionRules(
      [{ title: '훅' }, { title: 'b' }, { title: 'c' }],
      [],
      [],
      { voice: '대담' },
    );
    expect(out.caption.startsWith('🔥')).toBe(true);
  });

  it('passthroughEstimate stays within [0, 0.95]', () => {
    const out = applyCaptionRules([{ title: 'a' }, { title: 'b' }, { title: 'c' }]);
    expect(out.passthroughEstimate).toBeGreaterThanOrEqual(0);
    expect(out.passthroughEstimate).toBeLessThanOrEqual(0.95);
  });
});
