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
      // iPhone 14 viewport/touch profile on Chromium so it runs everywhere.
      // Set PLAYWRIGHT_WEBKIT=1 (after `npx playwright install webkit`) for real WebKit.
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
        browserName: process.env.PLAYWRIGHT_WEBKIT ? 'webkit' : 'chromium',
      },
      testMatch: /mobile-nav|edit/,
    },
  ],
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev --port 3002',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
