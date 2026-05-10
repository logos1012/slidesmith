// Centralized, validated env. The ONLY module allowed to read process.env.
// All other modules import { env } from "./env.js".
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3002),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  PUPPETEER_EXECUTABLE_PATH: z.string().min(1).default("/usr/bin/chromium"),
  RENDER_OUT_DIR: z.string().min(1).default("/tmp/render-out"),
  // Cycle 3 — image-slot CSP allowlist. Comma-separated hostnames the
  // renderer is allowed to fetch image bytes from before inlining as
  // `data:` URIs. Defaults to the docker compose storage host + the
  // default S3 presigned-URL host (`s3.<region>.amazonaws.com` is the
  // path-style endpoint and the bucket-virtual-host pattern). Operators
  // override this for staging / prod buckets. NEVER include `localhost`
  // or RFC1918 ranges — see image-fetch.ts for the SSRF defense story.
  IMAGE_FETCH_HOSTS: z
    .string()
    .min(1)
    .default(
      "slidesmith-storage,s3.ap-northeast-2.amazonaws.com,slidesmith-carousel.s3.ap-northeast-2.amazonaws.com,placehold.co",
    ),
  // NOTE: BROWSER_POOL_SIZE intentionally removed — SPEC §7 mandates size 1
  // (single Chromium instance, ~1.2GB peak memory). Multi-browser would
  // exceed the 1.5GB cap. The constant lives in browser-pool.ts.
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast on misconfiguration — 12-Factor #3.
  // console.error is allowed by eslint's no-console rule (allow: ["warn","error"]).
  console.error("[render] Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env: Env = parsed.data;
