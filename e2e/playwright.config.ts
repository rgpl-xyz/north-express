import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;
const isCI = Boolean(process.env['CI']);

/**
 * End-to-end tests run against `ng serve`. Digitraffic is mocked in every test
 * (see digitraffic-mocks.ts), so they never touch the real API.
 */
export default defineConfig({
  testDir: '.',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx ng serve --port ${PORT}`,
    cwd: '..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
