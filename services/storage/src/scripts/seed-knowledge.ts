// seed-knowledge.ts — CLI wrapper around seedKnowledge() (PRD §5-2).
// Usage: `pnpm tsx src/scripts/seed-knowledge.ts` or `pnpm seed:knowledge`.
// The same code path serves the wizard's POST /knowledge/seed endpoint.
import { getRepos } from '../repositories/container.js';
import { seedKnowledge } from '../seed/seed-service.js';
import { logger } from '../lib/logger.js';

async function main(): Promise<void> {
  const startedAt = Date.now();
  logger.info('knowledge_seed_cli_start');
  const report = await seedKnowledge(getRepos().knowledge);
  const ms = Date.now() - startedAt;
  // Plain stdout for ops scripts that grep this line.
  process.stdout.write(`${JSON.stringify({ ...report, totalMs: ms }, null, 2)}\n`);
  if (report.failed > 0) {
    logger.error({ failed: report.failed, failures: report.failures }, 'knowledge_seed_partial');
    process.exit(1);
  }
  logger.info({ ms, ...report }, 'knowledge_seed_cli_done');
  process.exit(0);
}

main().catch((err: unknown) => {
  logger.error({ err: (err as Error).message }, 'knowledge_seed_cli_crashed');
  process.stderr.write(`${(err as Error).stack ?? (err as Error).message}\n`);
  process.exit(2);
});
