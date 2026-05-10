// src/lib/logger.ts — pino with secret redaction.
// 12-Factor #11 (logs to stdout). Redact API keys per code-review checklist Q4.

import pino from 'pino';
import { loadEnv } from './env.js';

const env = loadEnv();

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'slidesmith-llm', env: env.NODE_ENV },
  redact: {
    // Cycle 2 Fix F7: broaden redact paths.
    //   - error.headers.* (Anthropic SDK throws APIError with response headers)
    //   - Authorization (capital alias) for vendors that don't lowercase
    //   - req.body.message / req.body.prompt → user prompts may be sensitive
    paths: [
      '*.api_key',
      '*.apiKey',
      '*.ANTHROPIC_API_KEY',
      '*.GEMINI_API_KEY',
      'req.headers.authorization',
      'req.headers.Authorization',
      'req.headers["x-api-key"]',
      'req.headers["X-Api-Key"]',
      'error.headers.*',
      'err.headers.*',
      'req.body.prompt',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
