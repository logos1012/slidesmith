// load-knowledge-51.ts — read + Zod-validate the v1.0 51-item seed bundle.
// PRD §5-2 distribution: Frameworks 10 / Hooks 15 / Narratives 7 / BrandVoice 1
// / KoreanPatterns 8 / SensitiveTopics 10 = 51. The JSON file is the single
// source of truth — both the route (POST /knowledge/seed) and the CLI
// (`tsx src/scripts/seed-knowledge.ts`) call this loader so onboarding wizard
// and ops `pnpm seed` behave identically.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import type { KnowledgeCreate, KnowledgeCategory } from '../types/domain.js';

const KNOWLEDGE_CATEGORIES = [
  'Frameworks',
  'Psychology',
  'Hooks',
  'Narratives',
  'BrandVoice',
  'KoreanPatterns',
  'SensitiveTopics',
] as const;

const SeedItem = z
  .object({
    name: z.string().min(1).max(200),
    category: z.enum(KNOWLEDGE_CATEGORIES),
    description: z.string().optional().default(''),
    whenToUse: z.string().optional().default(''),
    structure: z.string().optional().default(''),
    examples: z.string().optional().default(''),
    tags: z.array(z.string()).optional().default([]),
    // Forward-compat extras carried in the seed JSON but not stored as
    // top-level Knowledge columns. Severity is captured in `description` /
    // `tags` since the v1.0 schema doesn't have a column for it (PRD §8-1
    // SensitiveTopics severity column lives in v1.1 schema).
    severity: z.number().int().min(1).max(5).optional(),
    slideCount: z.number().int().min(1).max(20).optional(),
  })
  .strict();

const SeedBundle = z.object({
  version: z.string(),
  totalCount: z.number().int().positive(),
  distribution: z.record(z.string(), z.number().int().nonnegative()),
  items: z.array(SeedItem),
});

export type LoadedSeedItem = z.infer<typeof SeedItem>;
export type LoadedSeedBundle = z.infer<typeof SeedBundle>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cached: LoadedSeedBundle | null = null;

/**
 * Load + validate the seed bundle. Result is cached because both the route and
 * the CLI invoke it on every run; the file is shipped immutable in the image.
 *
 * Throws if the bundle drifts from the PRD distribution (Frameworks 10 / Hooks
 * 15 / ...). That's intentional — silent drift would make the onboarding
 * "AI 품질을 위한 시드 import" promise (PRD §5-2) impossible to keep.
 */
export function loadKnowledge51(): LoadedSeedBundle {
  if (cached) return cached;
  const path = join(__dirname, 'knowledge-51.json');
  const raw = readFileSync(path, 'utf-8');
  const parsed = SeedBundle.parse(JSON.parse(raw));

  if (parsed.totalCount !== 51 || parsed.items.length !== 51) {
    throw new Error(
      `seed bundle drift: declared totalCount=${parsed.totalCount}, items=${parsed.items.length}; expected 51`,
    );
  }

  // PRD §5-2 v1.0 distribution check.
  const expected: Record<KnowledgeCategory, number> = {
    Frameworks: 10,
    Hooks: 15,
    Narratives: 7,
    BrandVoice: 1,
    KoreanPatterns: 8,
    SensitiveTopics: 10,
    Psychology: 0, // v1.1, schema only
  };
  const actual: Record<string, number> = {};
  for (const item of parsed.items) {
    actual[item.category] = (actual[item.category] ?? 0) + 1;
  }
  for (const [cat, want] of Object.entries(expected)) {
    const have = actual[cat] ?? 0;
    if (have !== want) {
      throw new Error(
        `seed distribution drift in category=${cat}: have ${have}, want ${want}`,
      );
    }
  }

  cached = parsed;
  return parsed;
}

/** Map a seed item to the vendor-neutral KnowledgeCreate payload. */
export function toKnowledgeCreate(item: LoadedSeedItem): KnowledgeCreate {
  // Severity / slideCount are forward-compat metadata not in the v1.0 column
  // set — encode them into `tags` so they survive the round-trip without
  // requiring a schema migration today.
  const extras: string[] = [];
  if (item.severity !== undefined) extras.push(`severity:${item.severity}`);
  if (item.slideCount !== undefined) extras.push(`slides:${item.slideCount}`);
  return {
    name: item.name,
    category: item.category,
    description: item.description,
    whenToUse: item.whenToUse,
    structure: item.structure,
    examples: item.examples,
    tags: extras.length === 0 ? item.tags : [...item.tags, ...extras],
  };
}

/** Test-only — drop the cache so a unit test can re-validate the bundle. */
export function _resetSeedCache(): void {
  cached = null;
}

export { KNOWLEDGE_CATEGORIES };
