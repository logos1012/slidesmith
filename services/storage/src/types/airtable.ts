// airtable.ts — vendor types (NEVER exported across HTTP boundary).
// SPEC §6 + ARCH §7: vendor words must not leak into responses.
// Use these types only inside repositories + lib/vendor-mapper.

export interface AirtableRecord<F = Record<string, unknown>> {
  id: string;
  fields: F;
  createdTime: string;
}

export interface AirtableListResponse<F = Record<string, unknown>> {
  records: AirtableRecord<F>[];
  offset?: string;
}

// ─── Knowledge raw fields ────────────────────────────
export interface AirtableKnowledgeFields {
  name?: string;
  category?: string;
  description?: string;
  when_to_use?: string;
  structure?: string;
  examples?: string;
  tags?: string[];
}

// ─── Templates raw fields ────────────────────────────
export interface AirtableTemplateFields {
  name?: string;
  schema?: string;
  narrative_arc?: string;
  files?: string;
  version?: string;
  usage_count?: number;
}

// ─── Carousels raw fields (11 forward-compat fields, ARCH §3-8) ─
export interface AirtableCarouselFields {
  brief?: string;
  template_id?: string;
  content_json?: string;
  brand_dsl_snapshot?: string;
  hook_category?: string;
  narrative_arc?: string;
  frameworks_used?: string[];
  s3_keys?: string[];
  aspect_ratio?: string;
  watermark_enabled?: boolean;
  template_schema_version?: string;

  // forward-compat (v1.0 placeholders)
  series_id?: string;
  series_volume?: number;
  parent_carousel_id?: string;
  repurpose_type?: string;
  moderation_status?: string;
  caption_json?: string;
  insights_json?: string;
  last_used_at?: string;
  version_history?: string;
}

// ─── Elements raw fields ─────────────────────────────
export interface AirtableElementFields {
  type?: string;
  name?: string;
  src?: string;
  aliases?: string[];
  tags?: string[];
}
