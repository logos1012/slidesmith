// logger.ts — structured pino logger (12-Factor #11: stdout only)
// SPEC §5.1 + sw-engineering 5-1: redact Airtable PAT + AWS keys.
import { pino } from 'pino';
import { loadEnv } from './env.js';

const env = loadEnv();

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'slidesmith-storage', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.AIRTABLE_PAT',
      '*.AWS_ACCESS_KEY_ID',
      '*.AWS_SECRET_ACCESS_KEY',
      'env.AIRTABLE_PAT',
      'env.AWS_ACCESS_KEY_ID',
      'env.AWS_SECRET_ACCESS_KEY',
      'config.airtable.pat',
      'config.aws.secretAccessKey',
      'config.aws.accessKeyId',
    ],
    remove: false,
    censor: '[REDACTED]',
  },
});

export type Logger = typeof logger;
