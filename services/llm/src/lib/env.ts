// src/lib/env.ts — single source of truth for runtime config (12-Factor #3).
// This is the ONLY file allowed to read process.env (see eslint.config.mjs).

import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Anthropic (Cycle 2 정식 사용; Cycle 1 기동에는 optional)
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  CLAUDE_CLI_PATH: z.string().min(1).optional(),

  // Gemini (v1.0 후반)
  GEMINI_API_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  // env.ts is the ONLY file allowed to read process.env (eslint override
  // in eslint.config.mjs disables `no-restricted-properties` here).
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test-only: clear the cached env (DO NOT call from production code). */
export function _resetEnvForTests(): void {
  cached = null;
}
