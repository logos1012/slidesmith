// seed-templates-service.ts — idempotent (name) upsert of the v1.0 default Templates bundle.
// Called from `POST /templates/seed` (onboarding wizard). Mirrors seed-service.ts
// (Knowledge) so the contract — "running it twice produces N records, not 2N" —
// is enforced in one place per resource.
import type { ITemplateRepo } from '../repositories/interfaces/ITemplateRepo.js';
import { sanitiseUpstream } from '../lib/sanitizer.js';
import { loadTemplatesDefault, toTemplateCreate } from './load-templates-default.js';

// Boundary sanitisation lives in lib/sanitizer.ts so a future vendor word added
// there is honoured here automatically (no drift between server.ts onError and
// the seed failure report that ships in the 201 body).

export interface TemplatesSeedReport {
  inserted: number;
  skipped: number;
  failed: number;
  total: number;
  failures: Array<{ name: string; error: string }>;
  durationMs: number;
}

/**
 * Walk the default templates bundle and upsert each via the ITemplateRepo:
 *  - hit on `name` → skip (count under `skipped`)
 *  - miss → create (count under `inserted`)
 *  - any thrown error → recorded under `failed` + `failures[]` so the wizard
 *    can show partial-success state instead of crashing the whole import.
 *
 * Sequential on purpose — keeps the report deterministic for tests and avoids
 * stampeding the rate-limiter (3 templates × ~150ms = trivial).
 */
export async function seedTemplates(
  repo: ITemplateRepo,
): Promise<TemplatesSeedReport> {
  const bundle = loadTemplatesDefault();
  const startedAt = Date.now();

  const report: TemplatesSeedReport = {
    inserted: 0,
    skipped: 0,
    failed: 0,
    total: bundle.items.length,
    failures: [],
    durationMs: 0,
  };

  for (const item of bundle.items) {
    try {
      const existing = await repo.findByName(item.name);
      if (existing) {
        report.skipped += 1;
        continue;
      }
      await repo.create(toTemplateCreate(item));
      report.inserted += 1;
    } catch (err) {
      report.failed += 1;
      report.failures.push({
        name: item.name,
        error: sanitiseUpstream((err as Error).message),
      });
    }
  }

  report.durationMs = Date.now() - startedAt;
  return report;
}
