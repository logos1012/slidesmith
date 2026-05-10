// vendor-mapper.ts — Airtable record → domain mapping (vendor isolation).
// SPEC §6 + ARCH §7. The ONLY place that touches AirtableRecord<*> on the way out.
// Tests in tests/unit/vendor-mapper.test.ts.
import type {
  AirtableRecord,
  AirtableKnowledgeFields,
  AirtableTemplateFields,
  AirtableCarouselFields,
  AirtableElementFields,
} from '../types/airtable.js';
import type {
  KnowledgeItem,
  KnowledgeCategory,
  TemplateItem,
  Carousel,
  ElementItem,
  ElementType,
} from '../types/domain.js';

const KNOWLEDGE_CATEGORIES: readonly KnowledgeCategory[] = [
  'Frameworks',
  'Psychology',
  'Hooks',
  'Narratives',
  'BrandVoice',
  'KoreanPatterns',
  'SensitiveTopics',
];

const ELEMENT_TYPES: readonly ElementType[] = ['character', 'background', 'prop', 'style'];

function asKnowledgeCategory(value: unknown): KnowledgeCategory {
  if (typeof value === 'string' && (KNOWLEDGE_CATEGORIES as readonly string[]).includes(value)) {
    return value as KnowledgeCategory;
  }
  return 'Frameworks';
}

function asElementType(value: unknown): ElementType {
  if (typeof value === 'string' && (ELEMENT_TYPES as readonly string[]).includes(value)) {
    return value as ElementType;
  }
  return 'prop';
}

function safeJson<T>(raw: unknown, fallback: T): T {
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.length > 0) return [value as unknown as T];
  return [];
}

export function airtableToKnowledge(record: AirtableRecord<AirtableKnowledgeFields>): KnowledgeItem {
  const f = record.fields;
  return {
    id: record.id,
    recordId: record.id,
    name: f.name ?? '',
    category: asKnowledgeCategory(f.category),
    description: f.description ?? '',
    whenToUse: f.when_to_use ?? '',
    structure: f.structure ?? '',
    examples: f.examples ?? '',
    tags: asArray<string>(f.tags),
  };
}

export function airtableToTemplate(record: AirtableRecord<AirtableTemplateFields>): TemplateItem {
  const f = record.fields;
  return {
    id: record.id,
    recordId: record.id,
    name: f.name ?? '',
    schema: safeJson<unknown>(f.schema, {}),
    narrativeArc: f.narrative_arc ?? '',
    files: asArray<string>(f.files),
    version: f.version ?? '0.0.0',
    usageCount: typeof f.usage_count === 'number' ? f.usage_count : 0,
  };
}

export function airtableToElement(record: AirtableRecord<AirtableElementFields>): ElementItem {
  const f = record.fields;
  return {
    id: record.id,
    recordId: record.id,
    type: asElementType(f.type),
    name: f.name ?? '',
    src: f.src ?? '',
    aliases: asArray<string>(f.aliases),
    tags: asArray<string>(f.tags),
  };
}

export function airtableToCarousel(record: AirtableRecord<AirtableCarouselFields>): Carousel {
  const f = record.fields;
  return {
    id: record.id,
    recordId: record.id,
    brief: f.brief ?? '',
    templateId: f.template_id ?? '',
    content: safeJson<unknown>(f.content_json, {}),
    brandDSLSnapshot: safeJson<unknown>(f.brand_dsl_snapshot, {}),
    hookCategory: f.hook_category ?? null,
    narrativeArc: f.narrative_arc ?? null,
    frameworksUsed: asArray<string>(f.frameworks_used),
    s3Keys: asArray<string>(f.s3_keys),
    aspectRatio: f.aspect_ratio ?? '1:1',
    watermarkEnabled: Boolean(f.watermark_enabled),
    templateSchemaVersion: f.template_schema_version ?? '1.0.0',
    seriesId: f.series_id ?? null,
    seriesVolume: typeof f.series_volume === 'number' ? f.series_volume : null,
    parentCarouselId: f.parent_carousel_id ?? null,
    repurposeType: f.repurpose_type ?? null,
    moderationStatus: f.moderation_status ?? null,
    captionJson: safeJson<unknown>(f.caption_json, null),
    insightsJson: safeJson<unknown>(f.insights_json, null),
    lastUsedAt: f.last_used_at ?? null,
    versionHistory: safeJson<unknown[]>(f.version_history, []),
    createdAt: record.createdTime,
  };
}
