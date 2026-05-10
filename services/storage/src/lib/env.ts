// env.ts — Zod-validated environment loader (12-Factor #3)
// SERVICE-storage.md §4. Direct process.env elsewhere is forbidden.
import { z } from 'zod';

// Placeholder strings used as `default()` values. They unblock `pnpm dev` boot
// without a real `.env`, but must be rejected in production so an unconfigured
// container never reports `airtable.available: true` while pointed at nothing.
const PLACEHOLDER_PATTERNS = [
  /-placeholder$/i,
  /^pat-dummy/i,
  /^pat[-_]?(test|fake|example)/i,
  /^AKIA-?placeholder/i,
];

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return false;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(value));
}

const Schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3003),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // Airtable
    AIRTABLE_PAT: z.string().min(1, 'AIRTABLE_PAT required').default('pat-placeholder'),
    AIRTABLE_BASE_ID: z.string().min(1, 'AIRTABLE_BASE_ID required').default('app-placeholder'),
    AIRTABLE_API_BASE: z.string().url().default('https://api.airtable.com/v0'),

    // AWS S3
    AWS_ACCESS_KEY_ID: z.string().min(1).default('AKIA-placeholder'),
    AWS_SECRET_ACCESS_KEY: z.string().min(1).default('secret-placeholder'),
    AWS_S3_BUCKET: z.string().min(1).default('slidesmith-carousel'),
    AWS_S3_REGION: z.string().min(1).default('ap-northeast-2'),

    // Cache / boundary tuning (override-friendly for tests)
    AIRTABLE_CACHE_TTL_MS: z.coerce.number().int().positive().default(5 * 60 * 1000),
    AIRTABLE_CACHE_MAX: z.coerce.number().int().positive().default(500),
    AIRTABLE_BULKHEAD: z.coerce.number().int().positive().default(5),
    S3_BULKHEAD: z.coerce.number().int().positive().default(8),
    IDEMPOTENCY_TTL_MS: z.coerce.number().int().positive().default(24 * 60 * 60 * 1000),
  })
  .superRefine((env, ctx) => {
    // Production must not boot with placeholder credentials. This guards the
    // misleading `/health.airtable.available: true` flag at first-startup
    // (Cycle 1 Review Medium-1 / Test §11.1).
    if (env.NODE_ENV !== 'production') return;
    const offenders: Array<[string, string]> = [];
    if (isPlaceholder(env.AIRTABLE_PAT)) offenders.push(['AIRTABLE_PAT', env.AIRTABLE_PAT]);
    if (isPlaceholder(env.AIRTABLE_BASE_ID))
      offenders.push(['AIRTABLE_BASE_ID', env.AIRTABLE_BASE_ID]);
    if (isPlaceholder(env.AWS_ACCESS_KEY_ID))
      offenders.push(['AWS_ACCESS_KEY_ID', env.AWS_ACCESS_KEY_ID]);
    if (isPlaceholder(env.AWS_SECRET_ACCESS_KEY))
      offenders.push(['AWS_SECRET_ACCESS_KEY', '<redacted>']);
    for (const [path] of offenders) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path],
        message: `placeholder credential not allowed in production (${path})`,
      });
    }
  });

export type AppEnv = z.infer<typeof Schema>;

let cached: AppEnv | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  if (cached) return cached;
  const parsed = Schema.safeParse(source);
  if (!parsed.success) {
    // surface a single condensed error string — server.ts handles exit
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Reset for tests only. */
export function _resetEnv(): void {
  cached = null;
}
