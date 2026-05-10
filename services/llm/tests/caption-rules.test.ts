// tests/caption-rules.test.ts — pure function tests for the 5 rules.

import { describe, it, expect } from 'vitest';
import {
  buildCaption,
  distributeHashtags,
  estimatePassthrough,
  applyCaptionRules,
} from '../src/lib/caption-rules.js';

describe('caption-rules', () => {
  it('buildCaption emits hook + body + CTA', () => {
    const caption = buildCaption([
      { title: '훅' },
      { title: '본문 1', body: '설명' },
      { title: 'CTA' },
    ]);
    expect(caption).toContain('훅');
    expect(caption).toContain('본문 1');
    expect(caption).toContain('CTA');
    expect(caption).toMatch(/^[✨🔥💡👀🚀]/u);
  });

  it('buildCaption truncates at 2200 chars', () => {
    const slides = Array.from({ length: 50 }, (_, i) => ({
      title: `t${i}`,
      body: 'x'.repeat(200),
    }));
    const caption = buildCaption(slides);
    expect(caption.length).toBeLessThanOrEqual(2200);
  });

  it('buildCaption handles empty input', () => {
    expect(buildCaption([])).toBe('');
  });

  it('distributeHashtags returns 5/15/10', () => {
    const seed = Array.from({ length: 30 }, (_, i) => `tag${i}`);
    const out = distributeHashtags(seed);
    expect(out.highReach).toHaveLength(5);
    expect(out.medium).toHaveLength(15);
    expect(out.niche).toHaveLength(10);
    expect(out.highReach[0]).toMatch(/^#/);
  });

  it('distributeHashtags pads when seed is short', () => {
    const out = distributeHashtags(['only', 'two']);
    expect(out.highReach).toHaveLength(5);
    expect(out.medium).toHaveLength(15);
    expect(out.niche).toHaveLength(10);
  });

  it('distributeHashtags strips leading hashes', () => {
    const out = distributeHashtags(['#hello', '##world']);
    expect(out.highReach[0]).toBe('#hello');
    expect(out.highReach[1]).toBe('#world');
  });

  it('estimatePassthrough scores 0.5–0.95', () => {
    const score = estimatePassthrough('짧은');
    expect(score).toBeGreaterThanOrEqual(0.5);
    expect(score).toBeLessThanOrEqual(0.95);
  });

  it('estimatePassthrough rewards CTA arrow + hook emoji', () => {
    const long = '✨ '.padEnd(120, 'x') + ' 👉 click';
    const score = estimatePassthrough(long, ['x']);
    expect(score).toBeGreaterThan(0.7);
  });

  it('applyCaptionRules combines all 5 rules', () => {
    const out = applyCaptionRules(
      [{ title: 'a' }, { title: 'b' }, { title: 'c' }],
      ['x', 'y', 'z'],
      ['signature'],
    );
    expect(out.caption).not.toBe('');
    expect(out.hashtags.highReach.length + out.hashtags.medium.length + out.hashtags.niche.length).toBe(30);
    expect(out.passthroughEstimate).toBeGreaterThan(0);
  });
});
