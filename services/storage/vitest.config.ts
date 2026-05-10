// vitest config — slidesmith-storage
// SPEC §12: Cycle 1 — vendor-mapper unit + /health integration (mock Airtable)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      // server.ts is the process entry (`serve()` + signals), not exercised in
      // unit/integration. types/* + repositories/interfaces/* are pure type
      // declarations (zero runtime). logger.ts is a thin pino config shim.
      exclude: [
        'src/**/*.test.ts',
        'src/types/**',
        'src/repositories/interfaces/**',
        'src/server.ts',
        'src/lib/logger.ts',
        // CLI entrypoint — exercised by docker compose smoke + ops `pnpm seed`,
        // not by Vitest. Same exemption as server.ts.
        'src/scripts/**',
      ],
      // Cycle 3 §E — bumped from 70/70/70/60 to 85/85/85/75. Current run sits at
      // 90.88% lines / 84.86% branches; thresholds are set just under the
      // observed numbers so a regression of any meaningful size hard-fails CI.
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 75,
      },
    },
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});
