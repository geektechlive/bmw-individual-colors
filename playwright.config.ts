import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3002',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // iPhone 14 on real WebKit (Safari's engine). Needs `npx playwright install webkit`.
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
      testMatch: /mobile-nav|edit/,
    },
    {
      // Always-on WebKit for the design matrix and interactions (design spec, "How it is
      // checked"): paint swatches, blend modes and -webkit-box-reflect render differently here.
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /design|interactions/,
    },
  ],
  // Against a deployed site (PLAYWRIGHT_BASE_URL) no local server is needed or started.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'node node_modules/next/dist/bin/next dev --port 3002',
        url: 'http://localhost:3002',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
