import { describe, it, expect } from 'vitest';
import { branding } from '@/lib/branding';

// branding은 런타임 단일 source — 어디서도 hardcode 금지.
describe('lib/branding', () => {
  it('exposes a non-empty tagline', () => {
    expect(branding.tagline.length).toBeGreaterThan(0);
  });

  it('exposes a valid HTTPS GitHub URL', () => {
    expect(branding.githubRepo).toMatch(/^https:\/\/github\.com\//);
  });

  it('product name is Slidesmith', () => {
    expect(branding.productName).toBe('Slidesmith');
  });

  it('object is frozen (immutable single source)', () => {
    expect(Object.isFrozen(branding)).toBe(true);
  });
});
