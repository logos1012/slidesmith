// tests/moderation.test.ts — sensitive-topics regex matching.

import { describe, it, expect, beforeEach } from 'vitest';
import { checkModeration, _resetModerationCache } from '../src/services/moderation.service.js';

describe('moderation', () => {
  beforeEach(() => _resetModerationCache());

  it('approves benign text', () => {
    const res = checkModeration({ text: '오늘 점심 뭐 먹지?' });
    expect(res.blocked).toBe(false);
    expect(res.matchedKeywords).toEqual([]);
  });

  it('blocks political keyword with Korean userMessage', () => {
    const res = checkModeration({ text: '이번 선거에서 누구를 뽑을까?' });
    expect(res.blocked).toBe(true);
    expect(res.reason).toBe('political');
    expect(res.matchedKeywords).toContain('선거');
    expect(res.userMessage?.what).toContain('political');
    expect(res.userMessage?.why).toBeDefined();
    expect(res.userMessage?.next).toBeDefined();
    expect(res.userMessage?.recovery).toBeDefined();
  });

  it('honors custom sensitiveTopics from caller', () => {
    const res = checkModeration({
      text: '비밀단어가 들어있어요',
      sensitiveTopics: [{ category: 'custom', keywords: ['비밀단어'] }],
    });
    expect(res.blocked).toBe(true);
    expect(res.reason).toBe('custom');
  });

  it('escapes regex special chars in keywords', () => {
    const res = checkModeration({
      text: '주식 추천 받고 싶어요',
      sensitiveTopics: [{ category: 'finance', keywords: ['주식 추천'] }],
    });
    expect(res.blocked).toBe(true);
  });

  it('first match wins (returns single match)', () => {
    const res = checkModeration({ text: '선거 또는 정당 얘기' });
    expect(res.blocked).toBe(true);
    expect(res.matchedKeywords).toHaveLength(1);
  });
});
