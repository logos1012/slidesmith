import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      // Types are pure type aliases (zero runtime). browser-pool is exercised
      // by the docker compose smoke step (it requires real Chromium); unit
      // tests that mock browser-pool already cover the call-sites that matter.
      exclude: [
        "src/server.ts",
        "src/templates/**",
        "src/types/**",
        "src/services/browser-pool.ts",
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
    testTimeout: 10_000,
  },
});
