// domain.ts — public domain types (vendor-neutral, exported across HTTP).
// ARCH §7-1: never use vendor words like `airtableRecordId`, `s3Url`, etc.
// Use `recordId`, `assetUrl`, `content`, `jobId` instead.

export type KnowledgeCategory =
  | 'Frameworks'
  | 'Psychology'
  | 'Hooks'
  | 'Narratives'
  | 'BrandVoice'
  | 'KoreanPatterns'
  | 'SensitiveTopics';

export interface KnowledgeItem {
  id: string;
  recordId: string;
  name: string;
  category: KnowledgeCategory;
  description: string;
  whenToUse: string;
  structure: string;
  examples: string;
  tags: string[];
}

export interface TemplateItem {
  id: string;
  recordId: string;
  name: string;
  schema: unknown;
  narrativeArc: string;
  files: string[];
  version: string;
  usageCount: number;
}

export type ElementType = 'character' | 'background' | 'prop' | 'style';

export interface ElementItem {
  id: string;
  recordId: string;
  type: ElementType;
  name: string;
  src: string;
  aliases: string[];
  tags: string[];
}

/** Carousel domain object — 11 forward-compat fields preserved (ARCH §3-8). */
export interface Carousel {
  id: string;
  recordId: string;
  brief: string;
  templateId: string;
  content: unknown;
  brandDSLSnapshot: unknown;
  hookCategory: string | null;
  narrativeArc: string | null;
  frameworksUsed: string[];
  s3Keys: string[];
  aspectRatio: string;
  watermarkEnabled: boolean;
  templateSchemaVersion: string;

  // forward-compat (v1.0 placeholders, v1.1+ activated)
  seriesId: string | null;
  seriesVolume: number | null;
  parentCarouselId: string | null;
  repurposeType: string | null;
  moderationStatus: string | null;
  captionJson: unknown | null;
  insightsJson: unknown | null;
  lastUsedAt: string | null;
  versionHistory: unknown[];

  createdAt: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ListPage<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

// ─── Write payloads (vendor-neutral) ─────────────────
// Used by repositories' create/update — never references vendor types/words.

export interface KnowledgeCreate {
  name: string;
  category: KnowledgeCategory;
  description?: string;
  whenToUse?: string;
  structure?: string;
  examples?: string;
  tags?: string[];
}

export type KnowledgePatch = Partial<KnowledgeCreate>;

export interface TemplateCreate {
  name: string;
  schema?: unknown;
  narrativeArc?: string;
  files?: string[];
  version?: string;
  usageCount?: number;
}

export type TemplatePatch = Partial<TemplateCreate>;

export interface ElementCreate {
  type: ElementType;
  name: string;
  src: string;
  aliases?: string[];
  tags?: string[];
}

export type ElementPatch = Partial<ElementCreate>;

/**
 * Carousel write payload — all 11 forward-compat fields are accepted on create
 * even though only `hook_category` / `narrative_arc` / `last_used_at` /
 * `moderation_status` / `caption_json` are emitted in v1.0 (ARCH §14.7-15).
 * Day-1 schema, zero v1.1 / v1.5 migration burden.
 */
export interface CarouselCreate {
  brief?: string;
  templateId?: string;
  content?: unknown;
  brandDSLSnapshot?: unknown;
  hookCategory?: string | null;
  narrativeArc?: string | null;
  frameworksUsed?: string[];
  s3Keys?: string[];
  aspectRatio?: string;
  watermarkEnabled?: boolean;
  templateSchemaVersion?: string;

  // 11 forward-compat (Day 1 schema, v1.1+ may activate)
  seriesId?: string | null;
  seriesVolume?: number | null;
  parentCarouselId?: string | null;
  repurposeType?: string | null;
  moderationStatus?: string | null;
  captionJson?: unknown | null;
  insightsJson?: unknown | null;
  lastUsedAt?: string | null;
  versionHistory?: unknown[];

  /** Optional title for ergonomic clients; stored in `brief` if `brief` absent. */
  title?: string;
}

export type CarouselPatch = Partial<CarouselCreate>;

export interface BlobUploadResult {
  key: string;
  url: string;
  etag: string;
  expiresAt: string;
}

export interface BlobSignedUrl {
  url: string;
  expiresAt: string;
  ttlSeconds: number;
}
