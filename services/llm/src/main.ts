// src/main.ts — process entry point. Keeps server.ts side-effect free
// (export-only) so tests can `import { buildApp } from '../src/server.js'`
// without auto-starting the listener (Cycle 1 Review F6).
//
// 12-Factor #7 (port binding) + #9 (disposability).

import { serve } from '@hono/node-server';
import { buildApp } from './server.js';
import { loadEnv } from './lib/env.js';
import { logger } from './lib/logger.js';
import { detectClaudeCli } from './lib/claude-pool.js';
import { drainClaudePool } from './lib/claude-pool.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const app = buildApp();

  // Eagerly probe the Claude CLI so the first /health call is fast.
  await detectClaudeCli();

  const server = serve(
    { fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' },
    (info) => logger.info({ port: info.port }, 'slidesmith-llm listening'),
  );

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'shutdown_initiated');
    server.close(async (err) => {
      if (err) logger.error({ err: err.message }, 'shutdown_error');
      else logger.info('shutdown_complete');
      await drainClaudePool().catch((e: unknown) =>
        logger.error({ err: String(e) }, 'pool_drain_error'),
      );
      process.exit(err ? 1 : 0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  logger.error({ err: String(err) }, 'fatal_startup_error');
  process.exit(1);
});
