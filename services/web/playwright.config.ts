// Cycle 3 — Playwright E2E (PRD §16 7 시나리오, SERVICE-web.md §11 Cycle 3 Acceptance).
//   사전 조건: docker compose up (4 서비스 healthy).
//     테스트 실행: BASE_URL=http://localhost:3000 pnpm test:e2e
//   본 프로젝트는 단일 사용자 — login fixture 없음.
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // 4 서비스 부하 고려
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ko-KR',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
