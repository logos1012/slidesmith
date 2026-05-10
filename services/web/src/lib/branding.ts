// lib/branding.ts — 브랜딩 단일 source (SERVICE-web.md §4 + DESIGN-v3 5채널 일관)
// Tagline / GitHub URL은 빌드 시 NEXT_PUBLIC_* 로 inline.
// Cycle 1 Fix (F7): process.env 직접 접근 제거 → `lib/public-env.ts`만 의존.
// 단일 진입점 룰 위반 0 (eslint no-process-env disable 0회).
import { publicEnv } from '@/lib/public-env';

export const branding = Object.freeze({
  tagline: publicEnv.NEXT_PUBLIC_TAGLINE,
  githubRepo: publicEnv.NEXT_PUBLIC_GITHUB_REPO,
  productName: 'Slidesmith',
});

export type Branding = typeof branding;
