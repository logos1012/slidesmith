// seed-bundle.test.ts — verify the v1.0 51-item bundle matches the PRD §5-2
// distribution and that loadKnowledge51() catches drift before it reaches Airtable.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadKnowledge51,
  toKnowledgeCreate,
  _resetSeedCache,
} from '../../src/seed/load-knowledge-51.js';

describe('seed bundle — knowledge-51.json (Cycle 3 §A)', () => {
  beforeEach(() => _resetSeedCache());

  it('declares totalCount=51 and ships exactly 51 items', () => {
    const bundle = loadKnowledge51();
    expect(bundle.totalCount).toBe(51);
    expect(bundle.items.length).toBe(51);
  });

  it('matches the PRD §5-2 v1.0 distribution exactly', () => {
    const bundle = loadKnowledge51();
    const counts: Record<string, number> = {};
    for (const item of bundle.items) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    expect(counts).toEqual({
      Frameworks: 10,
      Hooks: 15,
      Narratives: 7,
      BrandVoice: 1,
      KoreanPatterns: 8,
      SensitiveTopics: 10,
    });
  });

  it('every item has a non-empty name + valid category', () => {
    const bundle = loadKnowledge51();
    for (const item of bundle.items) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.category.length).toBeGreaterThan(0);
    }
  });

  it('caches the bundle (second call returns same reference)', () => {
    const a = loadKnowledge51();
    const b = loadKnowledge51();
    expect(a).toBe(b);
  });

  it('toKnowledgeCreate strips the seed-only fields and folds severity into tags', () => {
    const bundle = loadKnowledge51();
    const sensitive = bundle.items.find(
      (i) => i.category === 'SensitiveTopics' && i.severity !== undefined,
    );
    expect(sensitive).toBeDefined();
    const create = toKnowledgeCreate(sensitive!);
    expect(create.name).toBe(sensitive!.name);
    expect(create.category).toBe('SensitiveTopics');
    expect(create.tags).toEqual(
      expect.arrayContaining([`severity:${sensitive!.severity}`]),
    );
    // raw severity is not a top-level KnowledgeCreate property
    expect(create).not.toHaveProperty('severity');
  });

  it('toKnowledgeCreate folds slideCount into tags for narratives', () => {
    const bundle = loadKnowledge51();
    const narrative = bundle.items.find(
      (i) => i.category === 'Narratives' && i.slideCount !== undefined,
    );
    expect(narrative).toBeDefined();
    const create = toKnowledgeCreate(narrative!);
    expect(create.tags).toEqual(
      expect.arrayContaining([`slides:${narrative!.slideCount}`]),
    );
  });

  it('items in same category have unique names (no upsert collisions)', () => {
    const bundle = loadKnowledge51();
    const seen = new Set<string>();
    for (const item of bundle.items) {
      const k = `${item.category}::${item.name}`;
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
    expect(seen.size).toBe(51);
  });
});
