import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/app/new/page.tsx',
        // 정적 운영자 점검 page — render 단순 정적 + env 표시. 단위 테스트 가치 낮음.
        'src/app/admin/security-checklist/page.tsx',
        'src/instrumentation.ts',
        // pure type interfaces (DIP) — 런타임 코드 0, ts-only
        'src/repositories/interfaces/**',
        'src/types/**',
        // pure type re-export modules (Cycle 3 B2 분리)
        'src/lib/saga-state-types.ts',
        'src/lib/container-types.ts',
        // prod-only path: better-sqlite3 native binding loaded via dynamic require.
        //   test/jsdom 환경에서는 load 실패 → memory fallback. 통합 테스트는 docker 컨테이너에서.
        'src/lib/saga-state-sqlite.ts',
        // pino logger (top-level config) — 모든 route가 import → 실 사용은 docker compose smoke로 검증.
        'src/lib/logger.ts',
      ],
      // Cycle 3 (B1): SPEC §11 Cycle 3 acceptance — 70/70/70/60 strict gate.
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // server-only는 Next 빌드 시점에 처리됨 — 테스트에서는 빈 스텁.
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
});
