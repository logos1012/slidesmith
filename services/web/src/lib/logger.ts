// lib/logger.ts — pino structured JSON + redact (SERVICE-web.md §8)
// stdout 출력 (12-Factor #11). 외부 수집기(CloudWatch/Datadog)가 빨아감.
import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'slidesmith-web' },
  redact: {
    // 보안 박제 — 비밀번호/토큰/API key 절대 로그 X
    paths: [
      '*.api_key',
      '*.apiKey',
      '*.token',
      '*.password',
      '*.secret',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
