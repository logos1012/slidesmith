// server.ts — Hono app + healthcheck + SIGTERM (12-Factor #6/#7/#9/#11).
// SPEC §1: Hono 4 + @hono/node-server, port 3003.
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { loadEnv } from './lib/env.js';
import { logger } from './lib/logger.js';
import { sanitiseUpstream } from './lib/sanitizer.js';
import { health } from './routes/health.js';
import { knowledge } from './routes/knowledge.js';
import { templates } from './routes/templates.js';
import { carousels } from './routes/carousels.js';
import { elements } from './routes/elements.js';
import { blob } from './routes/blob.js';

const env = loadEnv();
const app = new Hono();

app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  logger.info(
    { method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - start },
    'http',
  );
});

// Vendor-word sanitisation is centralised in lib/sanitizer.ts (Cycle 3 Fix L1)
// so server.ts and seed-service.ts can never drift again.

app.onError((err, c) => {
  logger.error({ err: err.message, stack: err.stack }, 'unhandled_error');
  const status = (err as { status?: number }).status === 404 ? 404 : 500;
  return c.json(
    { error: status === 404 ? 'not_found' : 'internal_error', message: sanitiseUpstream(err.message) },
    status,
  );
});

app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));

app.route('/health', health);
app.route('/knowledge', knowledge);
app.route('/templates', templates);
app.route('/carousels', carousels);
app.route('/elements', elements);
app.route('/blob', blob);

// Tests import `app` directly; opening a real socket from every test file
// would race on port 3003. Skip the serve() in test envs — production runs
// `node dist/server.js` with NODE_ENV=production (or development locally).
if (env.NODE_ENV !== 'test') {
  const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    logger.info({ port: info.port, env: env.NODE_ENV }, 'storage_listen');
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ signal }, 'shutdown_received');
    server.close(() => {
      logger.info('shutdown_complete');
      process.exit(0);
    });
    // safety: hard-exit if graceful close hangs
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export { app };
