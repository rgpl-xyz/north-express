import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;
const isCI = Boolean(process.env['CI']);
/** A running build to test instead of `ng serve`, such as CI's build under nginx. */
const BASE_URL = process.env['E2E_BASE_URL'] || undefined;

/**
 * End-to-end tests. Digitraffic is faked in every test (see fake-digitraffic.ts), so
 * they never touch the real API. They run against `ng serve` unless E2E_BASE_URL is set.
 */
export default defineConfig({
  testDir: '.',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // A test that passes only on a retry still fails CI, and its report is kept.
  failOnFlakyTests: isCI,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: BASE_URL ?? `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: BASE_URL
    ? undefined
    : {
        command: `npx ng serve --port ${PORT}`,
        cwd: '..',
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      },
});
