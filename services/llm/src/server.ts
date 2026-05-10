// src/server.ts — Hono app factory only. Side-effect free.
// Process entry lives in src/main.ts (Cycle 2 F6).

import { Hono } from 'hono';
import { logger } from './lib/logger.js';
import { sanitizeErrorMessage } from './lib/sanitize-error.js';
import { healthRoute } from './routes/health.js';
import { chatRoute } from './routes/chat.js';
import { contentRoute } from './routes/content.js';
import { captionRoute } from './routes/caption.js';
import { moderationRoute } from './routes/moderation.js';
import { imageRoute } from './routes/image.js';

export function buildApp(): Hono {
  const app = new Hono();
  app.route('/', healthRoute);
  app.route('/', chatRoute);
  app.route('/', contentRoute);
  app.route('/', captionRoute);
  app.route('/', moderationRoute);
  app.route('/', imageRoute);
  app.notFound((c) => c.json({ error: 'NOT_FOUND', path: c.req.path }, 404));
  app.onError((err, c) => {
    // Cycle 2 Fix F1: sanitize log payload too (defense-in-depth, redact paths
    // already cover headers/body fields but not free-form `err`).
    logger.error({ err: sanitizeErrorMessage(err.message), path: c.req.path }, 'unhandled_error');
    return c.json({ error: 'INTERNAL', message: 'unexpected_error' }, 500);
  });
  return app;
}
