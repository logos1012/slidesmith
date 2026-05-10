// ESLint flat config — Slidesmith Web
// Cycle 1 Fix (F4): IMPL §17-3 룰 5개 박제 — Day 1 D1-3 acceptance.
//   1) 3-Layer #1: Server Components/Views는 Service만 import (repositories 직접 X)
//   2~4) Cross-Context: Bounded Context (templates/elements/knowledge) 간 직접 import 차단
//   5) Vendor 캡슐화: airtable, @aws-sdk, @anthropic-ai/sdk, @google/genai 는 repositories/ 안에서만
//   + no-process-env: lib/env.ts + lib/public-env.ts 외 process.env 직접 접근 금지
import nextPlugin from 'eslint-config-next';

const config = [
  ...nextPlugin,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'data/**',
      'public/**',
      'coverage/**',
      'tests/e2e/screenshots/**',
      '*.tsbuildinfo',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-process-env': 'error',
      // Loop 1 Build (D-aurora-1, 2026-05-10): Aurora boundary 박제 (monochrome 정책 폐기).
      //   도구 UI = Aurora 토큰 자유 (--aurora-*, --grad-*, semantic alias).
      //   사용자 brand DSL `--brand-color-*` 는 SlidePreviewBoundary 안에서만 set 가능.
      //   격리 메커니즘은 monochrome 시절과 동일 — 토큰 namespace 분리만 유지 (Layer 1).
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.value=/^--brand-color-/]",
          message:
            '--brand-color-* 토큰은 src/components/slide-preview-boundary.tsx 안에서만 set 가능 (DESIGN-v3 §1-1-3 Aurora × Brand DSL boundary).',
        },
        {
          selector: "Literal[value=/var\\(--brand-color-/]",
          message:
            'var(--brand-color-*)는 src/components/slide-preview-boundary.tsx 안에서만 사용 가능 (DESIGN-v3 §1-1-3 Aurora × Brand DSL boundary).',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            // (1) 3-Layer #1: 컴포넌트/views는 repository impl(http/fakes)을 직접 import 금지.
            // interfaces (type-only) 는 허용 — DIP 정합 (UI는 type 계약만 의존).
            // Cycle 2 정정: container/services/api routes는 wiring 책임상 impl import 필요 → 별도 예외 group.
            {
              group: ['@/repositories/http/*', '@/repositories/fakes/*'],
              message:
                '3-Layer 룰: 컴포넌트/views는 repository impl을 직접 import 금지 (interfaces type만 허용, impl은 lib/container.ts에서만)',
            },
            // (2~4) Cross-Context: Bounded Context 간 직접 import 차단 (Cycle 2부터 활성)
            {
              group: ['@/components/templates/*'],
              importNames: ['*'],
              message:
                'Cross-Context import 금지 — WorkflowService 거쳐야 (templates BC)',
            },
            {
              group: ['@/components/elements/*'],
              importNames: ['*'],
              message: 'Cross-Context import 금지 — WorkflowService 거쳐야 (elements BC)',
            },
            {
              group: ['@/components/knowledge/*'],
              importNames: ['*'],
              message:
                'Cross-Context import 금지 (단 BrandContextProvider는 shared, lib에서 export)',
            },
            // (5) Vendor 캡슐화: 외부 SDK는 repositories/ 안에서만 (web은 외부 호출 0이지만 박제)
            {
              group: [
                'airtable',
                'airtable/*',
                '@aws-sdk/*',
                '@anthropic-ai/sdk',
                '@anthropic-ai/sdk/*',
                '@google/genai',
                '@google/genai/*',
              ],
              message:
                'Vendor SDK는 repositories/ 안에서만 (web은 외부 호출 0; 다른 서비스 통해야)',
            },
            // (6) deep relative path → @/ alias 강제 (기존 룰 유지)
            {
              group: ['../../app/**', '../../../app/**'],
              message: 'Use @/ alias instead of deep relative paths.',
            },
          ],
        },
      ],
    },
  },
  {
    // process.env 단일 진입점: lib/env.ts (server-only) + lib/public-env.ts (NEXT_PUBLIC_*)
    // + instrumentation.ts (Next.js 부팅 hook은 NEXT_RUNTIME 분기 1회 필요).
    files: ['src/lib/env.ts', 'src/lib/public-env.ts', 'src/instrumentation.ts'],
    rules: { 'no-process-env': 'off' },
  },
  {
    // repositories/ 안에서는 vendor SDK import 허용 (Vendor 캡슐화의 안쪽)
    files: ['src/repositories/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // DI wiring 단일 진입점 — repository impl(http/fakes) import 허용.
    // services/* 와 app/api/** 는 interfaces 만 type-only 의존 (위 group 정책으로 자동 통과).
    // Cycle 3 (B2 50줄 룰): wiring을 container-build.ts로 분리 — 동일 예외.
    files: ['src/lib/container.ts', 'src/lib/container-build.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // SlidePreviewBoundary는 brand 토큰 set의 단일 진입점 — Aurora swap 후에도 동일.
    files: ['src/components/slide-preview-boundary.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];

export default config;
