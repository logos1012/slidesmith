// lib/env.ts — server-only process.env wrapper (SERVICE-web.md §8)
// 유일하게 process.env 직접 접근 허용된 파일 (eslint.config.mjs 예외 등록).
// 모든 다른 코드는 이 파일에서 named export만 import.
import 'server-only';
import { z } from 'zod';

const Schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LLM_SERVICE_URL: z.string().url().default('http://slidesmith-llm:3001'),
  RENDER_SERVICE_URL: z.string().url().default('http://slidesmith-render:3002'),
  STORAGE_SERVICE_URL: z.string().url().default('http://slidesmith-storage:3003'),
  // v1.0.1 contract gap fix: BFF self-URL used by HttpRenderGateway to mint
  // temp URLs for ZIP-extracted PNGs that the Saga's upload-blob step then
  // fetches. Defaults to the Compose-internal name so render→S3 stays in-cluster.
  WEB_INTERNAL_URL: z.string().url().default('http://slidesmith-web:3000'),
  SAGA_DB_PATH: z.string().default('/app/data/saga.db'),
  LAN_EXPOSE: z.enum(['true', 'false']).default('false'),
  NEXT_PUBLIC_GITHUB_REPO: z.string().url().default('https://github.com/logos1012/slidesmith'),
  NEXT_PUBLIC_TAGLINE: z.string().min(1).default('한국어 인스타 카루셀, 1줄 → 5분 → 발행'),
  NEXT_PUBLIC_FEATURE_DARK_MODE: z.enum(['true', 'false']).default('true'),
  NEXT_PUBLIC_FEATURE_GEMINI: z.enum(['true', 'false']).default('false'),
});

const parsed = Schema.safeParse(process.env);
if (!parsed.success) {
  // fail fast — Day 0 보안 박제 (12-Factor #3)
  console.error('[env] invalid environment:', parsed.error.flatten().fieldErrors);
  throw new Error('invalid environment configuration');
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;
