// load-templates-default.ts — read + Zod-validate the v1.0 default Templates seed.
// v1.1.2: Aurora Light / Vibrant / Editorial were originally hand-inserted into
// Airtable. Reproducibility now requires a code-shipped bundle so every fresh
// workspace, every test database, and every CI run lands on the same 3
// templates without human intervention. Mirrors src/seed/load-knowledge-51.ts —
// same Zod-validate-then-cache pattern, same idempotent upsert downstream.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import type { TemplateCreate } from '../types/domain.js';

const SeedItem = z
  .object({
    name: z.string().min(1).max(200),
    // schema is an object in JSON; airtable-encode jsonOrUndef serialises to
    // string at the boundary. Keeping it as `unknown` here matches
    // TemplateCreate.schema and lets future templates ship richer shapes.
    schema: z.unknown(),
    narrative_arc: z.string().min(1),
    files: z.array(z.string().min(1)).min(1),
    version: z.string().min(1),
  })
  .strict();

const SeedBundle = z.object({
  version: z.string(),
  totalCount: z.number().int().positive(),
  items: z.array(SeedItem).min(3),
});

export type LoadedTemplateSeedItem = z.infer<typeof SeedItem>;
export type LoadedTemplateSeedBundle = z.infer<typeof SeedBundle>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cached: LoadedTemplateSeedBundle | null = null;

/**
 * Load + validate the templates seed bundle. Cached because the route invokes
 * it on every POST /templates/seed; the JSON file ships immutable in the image.
 *
 * Throws if `totalCount` and `items.length` disagree — same drift guard as the
 * knowledge bundle. Silent drift would mean Aurora templates could go missing
 * from a workspace and the wizard would have no idea.
 */
export function loadTemplatesDefault(): LoadedTemplateSeedBundle {
  if (cached) return cached;
  const path = join(__dirname, 'templates-default.json');
  const raw = readFileSync(path, 'utf-8');
  const parsed = SeedBundle.parse(JSON.parse(raw));

  if (parsed.totalCount !== parsed.items.length) {
    throw new Error(
      `templates seed drift: declared totalCount=${parsed.totalCount}, items=${parsed.items.length}`,
    );
  }

  cached = parsed;
  return parsed;
}

/** Map a seed item to the vendor-neutral TemplateCreate payload. */
export function toTemplateCreate(item: LoadedTemplateSeedItem): TemplateCreate {
  return {
    name: item.name,
    schema: item.schema,
    narrativeArc: item.narrative_arc,
    files: item.files,
    version: item.version,
  };
}

/** Test-only — drop the cache so a unit test can re-validate the bundle. */
export function _resetTemplatesSeedCache(): void {
  cached = null;
}
