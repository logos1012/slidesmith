// airtable-encode.ts — domain → AirtableFields (write-side mapper).
// Lives in repositories/airtable so vendor types stay encapsulated. The
// counterpart (read-side) is lib/vendor-mapper.ts. Together they form the
// only crossing of the vendor boundary (SPEC §6, ARCH §7).
import type {
  KnowledgeCreate,
  KnowledgePatch,
  TemplateCreate,
  TemplatePatch,
  ElementCreate,
  ElementPatch,
  CarouselCreate,
  CarouselPatch,
} from '../../types/domain.js';
import type {
  AirtableKnowledgeFields,
  AirtableTemplateFields,
  AirtableElementFields,
  AirtableCarouselFields,
} from '../../types/airtable.js';

/** Drops `undefined` keys so Airtable PATCH only touches provided fields. */
function compact<T extends object>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

function jsonOrUndef(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  if (v === null) return '';
  return typeof v === 'string' ? v : JSON.stringify(v);
}

export function encodeKnowledge(
  input: KnowledgeCreate | KnowledgePatch,
): Partial<AirtableKnowledgeFields> {
  return compact<AirtableKnowledgeFields>({
    name: input.name,
    category: input.category,
    description: input.description,
    when_to_use: input.whenToUse,
    structure: input.structure,
    examples: input.examples,
    tags: input.tags,
  });
}

export function encodeTemplate(
  input: TemplateCreate | TemplatePatch,
): Partial<AirtableTemplateFields> {
  return compact<AirtableTemplateFields>({
    name: input.name,
    schema: jsonOrUndef(input.schema),
    narrative_arc: input.narrativeArc,
    files: input.files === undefined ? undefined : input.files.join(','),
    version: input.version,
    usage_count: input.usageCount,
  });
}

export function encodeElement(
  input: ElementCreate | ElementPatch,
): Partial<AirtableElementFields> {
  return compact<AirtableElementFields>({
    type: input.type,
    name: input.name,
    src: input.src,
    aliases: input.aliases,
    tags: input.tags,
  });
}

/** Encodes the full Carousel surface — 11 forward-compat fields included. */
export function encodeCarousel(
  input: CarouselCreate | CarouselPatch,
): Partial<AirtableCarouselFields> {
  // `title` is an ergonomic alias for `brief` when brief is absent.
  const brief = input.brief ?? input.title;
  return compact<AirtableCarouselFields>({
    brief,
    template_id: input.templateId,
    content_json: jsonOrUndef(input.content),
    brand_dsl_snapshot: jsonOrUndef(input.brandDSLSnapshot),
    hook_category: input.hookCategory ?? undefined,
    narrative_arc: input.narrativeArc ?? undefined,
    frameworks_used: input.frameworksUsed,
    s3_keys: input.s3Keys,
    aspect_ratio: input.aspectRatio,
    watermark_enabled: input.watermarkEnabled,
    template_schema_version: input.templateSchemaVersion,
    series_id: input.seriesId ?? undefined,
    series_volume: input.seriesVolume ?? undefined,
    parent_carousel_id: input.parentCarouselId ?? undefined,
    repurpose_type: input.repurposeType ?? undefined,
    moderation_status: input.moderationStatus ?? undefined,
    caption_json: jsonOrUndef(input.captionJson),
    insights_json: jsonOrUndef(input.insightsJson),
    last_used_at: input.lastUsedAt ?? undefined,
    version_history: jsonOrUndef(input.versionHistory),
  });
}
