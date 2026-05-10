// tests/caption-service.test.ts — service-layer wrapper.

import { describe, it, expect } from 'vitest';
import { generateCaption } from '../src/services/caption.service.js';

describe('caption.service', () => {
  it('returns 30 hashtags + editable + platform default', () => {
    const out = generateCaption({
      slides: [{ title: 'Hook' }, { title: 'Body' }, { title: 'CTA' }],
      hashtagSeed: ['ai'],
    });
    expect(out.editable).toBe(true);
    expect(out.platform).toBe('instagram');
    expect(
      out.hashtags.highReach.length + out.hashtags.medium.length + out.hashtags.niche.length,
    ).toBe(30);
  });

  it('honors caller-supplied platform', () => {
    const out = generateCaption({
      slides: [{ title: 't' }],
      platform: 'linkedin',
    });
    expect(out.platform).toBe('linkedin');
  });
});
