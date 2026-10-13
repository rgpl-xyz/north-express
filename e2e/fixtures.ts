import { test as base, expect } from '@playwright/test';
import { FakeDigitraffic } from './fake-digitraffic';

export { expect };

/**
 * Playwright's test with Digitraffic faked. The fake starts in every test, even ones
 * that never use it, so no test can reach the real API, and a test fails if the app
 * made a request the fake has no answer for.
 */
export const test = base.extend<{ digitraffic: FakeDigitraffic }>({
  digitraffic: [
    async ({ page }, use) => {
      const digitraffic = new FakeDigitraffic();
      await digitraffic.serve(page);
      await use(digitraffic);
      expect(
        digitraffic.unexpectedRequests(),
        'Digitraffic requests the fake has no answer for',
      ).toEqual([]);
    },
    { auto: true },
  ],
});
