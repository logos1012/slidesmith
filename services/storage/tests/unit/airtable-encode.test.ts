// airtable-encode.test.ts — write-side mapper (domain → AirtableFields).
// Verifies the 11 forward-compat fields round-trip plus core compaction rules.
import { describe, it, expect } from 'vitest';
import {
  encodeKnowledge,
  encodeTemplate,
  encodeElement,
  encodeCarousel,
} from '../../src/repositories/airtable/airtable-encode.js';

describe('encodeKnowledge', () => {
  it('drops undefined keys (PATCH only touches what it sets)', () => {
    const out = encodeKnowledge({ name: 'PAS' });
    expect(Object.keys(out)).toEqual(['name']);
  });

  it('snake_cases the API surface (whenToUse → when_to_use)', () => {
    const out = encodeKnowledge({
      name: 'PAS',
      category: 'Frameworks',
      whenToUse: 'short hooks',
      tags: ['copy'],
    });
    expect(out.when_to_use).toBe('short hooks');
    expect(out.tags).toEqual(['copy']);
  });
});

describe('encodeTemplate', () => {
  it('serialises schema to JSON string + joins files', () => {
    const out = encodeTemplate({
      name: 'Listicle',
      schema: { slides: 10 },
      files: ['index.html', 'main.css'],
      usageCount: 3,
    });
    expect(out.schema).toBe('{"slides":10}');
    expect(out.files).toBe('index.html,main.css');
    expect(out.usage_count).toBe(3);
  });
});

describe('encodeElement', () => {
  it('passes through simple fields untouched', () => {
    const out = encodeElement({
      type: 'character',
      name: 'jisoo',
      src: 'https://x',
      aliases: ['지수'],
    });
    expect(out).toMatchObject({
      type: 'character',
      name: 'jisoo',
      src: 'https://x',
      aliases: ['지수'],
    });
  });
});

describe('encodeCarousel — 11 forward-compat fields', () => {
  it('encodes all 11 forward-compat fields when supplied', () => {
    const out = encodeCarousel({
      brief: 'b',
      templateId: 't',
      content: { slides: [] },
      brandDSLSnapshot: { primary: '#000' },
      hookCategory: 'curiosity',
      narrativeArc: 'reveal',
      frameworksUsed: ['PAS'],
      s3Keys: ['k1'],
      aspectRatio: '4:5',
      watermarkEnabled: true,
      templateSchemaVersion: '1.0.0',
      seriesId: 's1',
      seriesVolume: 2,
      parentCarouselId: 'recParent',
      repurposeType: 'remix',
      moderationStatus: 'PASSED',
      captionJson: { text: 'hi' },
      insightsJson: { impressions: 0 },
      lastUsedAt: '2026-05-10T00:00:00Z',
      versionHistory: [{ ts: '2026-05-10' }],
    });

    // 11 forward-compat presence assertions (one per field).
    expect(out.series_id).toBe('s1');
    expect(out.series_volume).toBe(2);
    expect(out.parent_carousel_id).toBe('recParent');
    expect(out.repurpose_type).toBe('remix');
    expect(out.hook_category).toBe('curiosity');
    expect(out.narrative_arc).toBe('reveal');
    expect(out.moderation_status).toBe('PASSED');
    expect(out.caption_json).toBe('{"text":"hi"}');
    expect(out.insights_json).toBe('{"impressions":0}');
    expect(out.last_used_at).toBe('2026-05-10T00:00:00Z');
    expect(out.version_history).toBe('[{"ts":"2026-05-10"}]');
  });

  it('falls back to title when brief is absent', () => {
    const out = encodeCarousel({ title: 'fallback' });
    expect(out.brief).toBe('fallback');
  });

  it('omits unset forward-compat fields (PATCH-safe)', () => {
    const out = encodeCarousel({ brief: 'only-brief' });
    expect(Object.keys(out)).toEqual(['brief']);
  });
});
