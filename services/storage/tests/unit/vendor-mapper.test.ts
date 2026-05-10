// vendor-mapper.test.ts — vendor isolation contract.
// Verifies AirtableRecord<*> → domain mapping never leaks vendor words.
import { describe, it, expect } from 'vitest';
import {
  airtableToKnowledge,
  airtableToTemplate,
  airtableToElement,
  airtableToCarousel,
} from '../../src/lib/vendor-mapper.js';
import type {
  AirtableRecord,
  AirtableKnowledgeFields,
  AirtableTemplateFields,
  AirtableElementFields,
  AirtableCarouselFields,
} from '../../src/types/airtable.js';

const VENDOR_WORDS = ['airtable', 's3Url', 's3Bucket', 'puppeteer', 'gemini', 'claudeMessage'];

function assertNoVendorWords(obj: unknown): void {
  const keys = JSON.stringify(obj).toLowerCase();
  for (const w of VENDOR_WORDS) {
    expect(keys).not.toContain(w.toLowerCase());
  }
}

describe('vendor-mapper', () => {
  it('airtableToKnowledge maps fields and exposes recordId', () => {
    const record: AirtableRecord<AirtableKnowledgeFields> = {
      id: 'recAAA',
      createdTime: '2026-05-10T00:00:00Z',
      fields: {
        name: 'PAS',
        category: 'Frameworks',
        description: 'Problem-Agitate-Solution',
        when_to_use: 'short hooks',
        structure: 'P → A → S',
        examples: 'ex1',
        tags: ['copywriting'],
      },
    };
    const out = airtableToKnowledge(record);
    expect(out.id).toBe('recAAA');
    expect(out.recordId).toBe('recAAA');
    expect(out.whenToUse).toBe('short hooks');
    expect(out.tags).toEqual(['copywriting']);
    assertNoVendorWords(out);
  });

  it('falls back to default category for unknown values', () => {
    const out = airtableToKnowledge({
      id: 'recX',
      createdTime: '2026-05-10T00:00:00Z',
      fields: { name: 'X', category: 'NotARealCategory' },
    });
    expect(out.category).toBe('Frameworks');
  });

  it('airtableToTemplate parses schema JSON safely + usageCount', () => {
    const record: AirtableRecord<AirtableTemplateFields> = {
      id: 'recT',
      createdTime: '2026-05-10T00:00:00Z',
      fields: {
        name: 'Listicle',
        schema: '{"slides":10}',
        narrative_arc: 'reveal',
        files: 'index.html',
        version: '1.0.0',
        usage_count: 7,
      },
    };
    const out = airtableToTemplate(record);
    expect(out.schema).toEqual({ slides: 10 });
    expect(out.files).toEqual(['index.html']);
    expect(out.usageCount).toBe(7);
    assertNoVendorWords(out);
  });

  it('airtableToTemplate tolerates malformed JSON', () => {
    const out = airtableToTemplate({
      id: 'recT2',
      createdTime: '2026-05-10T00:00:00Z',
      fields: { schema: '{not json' },
    });
    expect(out.schema).toEqual({});
  });

  it('airtableToElement clamps to known type', () => {
    const out = airtableToElement({
      id: 'recE',
      createdTime: '2026-05-10T00:00:00Z',
      fields: { type: 'character', name: 'jisoo', src: 'https://...', aliases: ['지수'], tags: [] },
    });
    expect(out.type).toBe('character');
    const fallback = airtableToElement({
      id: 'recE2',
      createdTime: '2026-05-10T00:00:00Z',
      fields: { type: 'unknown' },
    });
    expect(fallback.type).toBe('prop');
  });

  it('airtableToCarousel preserves all 11 forward-compat fields', () => {
    const record: AirtableRecord<AirtableCarouselFields> = {
      id: 'recC',
      createdTime: '2026-05-10T00:00:00Z',
      fields: {
        brief: 'b',
        template_id: 'tpl1',
        content_json: '{"slides":[]}',
        brand_dsl_snapshot: '{"primary":"#000"}',
        hook_category: 'curiosity',
        narrative_arc: 'reveal',
        frameworks_used: ['PAS'],
        s3_keys: ['k1', 'k2'],
        aspect_ratio: '4:5',
        watermark_enabled: true,
        template_schema_version: '1.0.0',
        series_id: 's1',
        series_volume: 2,
        parent_carousel_id: 'recParent',
        repurpose_type: 'remix',
        moderation_status: 'PASSED',
        caption_json: '{"text":"hi"}',
        insights_json: '{"impressions":0}',
        last_used_at: '2026-05-10T00:00:00Z',
        version_history: '[{"ts":"2026-05-10"}]',
      },
    };
    const out = airtableToCarousel(record);
    expect(out.recordId).toBe('recC');
    expect(out.content).toEqual({ slides: [] });
    expect(out.brandDSLSnapshot).toEqual({ primary: '#000' });
    expect(out.frameworksUsed).toEqual(['PAS']);
    expect(out.s3Keys).toEqual(['k1', 'k2']);
    expect(out.seriesVolume).toBe(2);
    expect(out.moderationStatus).toBe('PASSED');
    expect(out.captionJson).toEqual({ text: 'hi' });
    expect(out.versionHistory).toEqual([{ ts: '2026-05-10' }]);
    assertNoVendorWords(out);
  });

  it('airtableToCarousel defaults sensibly when fields are missing', () => {
    const out = airtableToCarousel({
      id: 'recEmpty',
      createdTime: '2026-05-10T00:00:00Z',
      fields: {},
    });
    expect(out.aspectRatio).toBe('1:1');
    expect(out.watermarkEnabled).toBe(false);
    expect(out.frameworksUsed).toEqual([]);
    expect(out.versionHistory).toEqual([]);
    expect(out.moderationStatus).toBeNull();
    expect(out.captionJson).toBeNull();
  });
});
