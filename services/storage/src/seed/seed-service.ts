// seed-service.ts — idempotent (name,category) upsert of the v1.0 51-item bundle.
// Called from `POST /knowledge/seed` (onboarding wizard) and from
// `tsx src/scripts/seed-knowledge.ts` (operator CLI). Both routes converge here
// so the contract — "running it twice produces 51 records, not 102" — is enforced
// in one place.
import type { IKnowledgeRepo } from '../repositories/interfaces/IKnowledgeRepo.js';
import { sanitiseUpstream } from '../lib/sanitizer.js';
import { loadKnowledge51, toKnowledgeCreate } from './load-knowledge-51.js';

// Boundary sanitisation lives in lib/sanitizer.ts (Cycle 3 Fix L1) — the seed
// failure report ships in the 201 body and bypasses server.ts onError, so it
// MUST scrub vendor words itself. Sharing one regex with server.ts means a new
// vendor word added to sanitizer.ts is honoured here automatically (no drift).

export interface SeedReport {
  inserted: number;
  skipped: number;
  failed: number;
  total: number;
  failures: Array<{ name: string; category: string; error: string }>;
  durationMs: number;
}

/**
 * Walk the 51 items and upsert each via the IKnowledgeRepo. The semantics:
 *  - hit on (name, category) → skip (count under `skipped`)
 *  - miss → create (count under `inserted`)
 *  - any thrown error → recorded under `failed` + `failures[]` so the wizard
 *    can show partial-success state instead of crashing the whole import.
 *
 * NOTE: this runs *sequentially*. With Airtable Bulkhead 5 we could parallelise,
 * but 51 items × ~150ms upstream = ~8s sequential which still beats the
 * SPEC §13 acceptance ("51 시드 일괄 import < 30초"). Sequential keeps the
 * report deterministic for tests and avoids stampeding the rate-limiter.
 */
export async function seedKnowledge(repo: IKnowledgeRepo): Promise<SeedReport> {
  const bundle = loadKnowledge51();
  const startedAt = Date.now();

  const report: SeedReport = {
    inserted: 0,
    skipped: 0,
    failed: 0,
    total: bundle.items.length,
    failures: [],
    durationMs: 0,
  };

  for (const item of bundle.items) {
    try {
      const existing = await repo.findByNameCategory(item.name, item.category);
      if (existing) {
        report.skipped += 1;
        continue;
      }
      await repo.create(toKnowledgeCreate(item));
      report.inserted += 1;
    } catch (err) {
      report.failed += 1;
      report.failures.push({
        name: item.name,
        category: item.category,
        error: sanitiseUpstream((err as Error).message),
      });
    }
  }

  report.durationMs = Date.now() - startedAt;
  return report;
}
