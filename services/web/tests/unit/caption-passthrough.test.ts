// Cycle 3 (A3) — Caption 70% Passthrough 5 rules unit tests.
import { describe, it, expect } from 'vitest';
import { applyCaptionRules } from '@/services/caption-passthrough';
import type { ContentSlide } from '@/repositories/interfaces/ILlmGateway';

const slides: ContentSlide[] = [
  { index: 0, title: '한국어 인스타 카루셀 가이드', body: '5분 만에 발행하는 워크플로우' },
  { index: 1, title: '템플릿 자동 매칭', body: '브리프에서 템플릿 자동 detect' },
];

describe('applyCaptionRules', () => {
  it('Rule 1 — passthrough ratio < 70% → warning', () => {
    const r = applyCaptionRules({ caption: '안녕하세요', hashtags: ['#a', '#b', '#c'], slides });
    // 모든 키워드 누락 → ratio ≈ 0 → warning.
    expect(r.ok).toBe(false);
    expect(r.warnings.some((w) => w.includes('passthrough'))).toBe(true);
  });

  it('Rule 3 — first line > 25자 → trimmed + warning', () => {
    const long = 'x'.repeat(40) + '\n핵심';
    const r = applyCaptionRules({ caption: long, hashtags: ['#a', '#b', '#c'], slides });
    expect(r.caption.split('\n')[0]!.length).toBeLessThanOrEqual(25);
    expect(r.warnings.some((w) => w.includes('first line'))).toBe(true);
  });

  it('Rule 4 — > 5 lines → clipped + warning', () => {
    const lines = '한국어\n인스타\n카루셀\n가이드\n5분\n발행\n워크플로우';
    const r = applyCaptionRules({ caption: lines, hashtags: ['#a', '#b', '#c'], slides });
    expect(r.caption.split('\n').length).toBeLessThanOrEqual(5);
    expect(r.warnings.some((w) => w.includes('lines'))).toBe(true);
  });

  it('Rule 5 — hashtags < 3 → warning, > 7 → clipped', () => {
    const tooFew = applyCaptionRules({ caption: 'x', hashtags: ['#a'], slides: [] });
    expect(tooFew.warnings.some((w) => w.includes('< 3'))).toBe(true);
    const tooMany = applyCaptionRules({
      caption: 'x', hashtags: Array.from({ length: 10 }, (_, i) => `#t${i}`), slides: [],
    });
    expect(tooMany.hashtags.length).toBe(7);
  });

  it('happy path: all rules pass → ok=true', () => {
    const goodCaption = '한국어 인스타 카루셀\n5분 만에 발행 워크플로우 가이드\n템플릿 자동 detect 매칭 브리프';
    const r = applyCaptionRules({
      caption: goodCaption, hashtags: ['#한국어', '#인스타', '#카루셀'], slides,
    });
    expect(r.warnings).toEqual([]);
    expect(r.ok).toBe(true);
  });
});
