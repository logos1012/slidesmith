// lib/public-env.ts — client-safe NEXT_PUBLIC_* env wrapper
// Cycle 1 Fix (F7): Review 🟠-4 — `lib/branding.ts`가 process.env를 직접 접근하던 우회를
// 단일 진입점으로 박제. server-only인 `lib/env.ts`와 달리 client bundle에서 import 가능.
//
// 룰: NEXT_PUBLIC_* 외 어떤 키도 여기서 읽지 말 것 (client에 leak 위험).
// 이 파일과 `lib/env.ts` 외 어느 곳도 process.env 직접 접근 X (eslint no-process-env).
import { z } from 'zod';

const PublicSchema = z.object({
  NEXT_PUBLIC_GITHUB_REPO: z
    .string()
    .url()
    .default('https://github.com/logos1012/slidesmith'),
  NEXT_PUBLIC_TAGLINE: z
    .string()
    .min(1)
    .default('한국어 인스타 카루셀, 1줄 → 5분 → 발행'),
  NEXT_PUBLIC_FEATURE_DARK_MODE: z.enum(['true', 'false']).default('true'),
  NEXT_PUBLIC_FEATURE_GEMINI: z.enum(['true', 'false']).default('false'),
});

// NEXT_PUBLIC_*는 빌드 시점에 inline되므로 client/server 양쪽 안전.
// 실패 시 default fallback (build-time fail-fast는 lib/env.ts가 server-only로 담당).
// 이 파일은 eslint.config.mjs에 no-process-env 예외로 등록됨 (lib/env.ts와 함께 단일 진입점).
const parsed = PublicSchema.safeParse(process.env);

export const publicEnv = Object.freeze(
  parsed.success ? parsed.data : PublicSchema.parse({}),
);
export type PublicEnv = typeof publicEnv;
