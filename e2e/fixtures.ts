import { type Page, test as base, expect } from '@playwright/test';
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

/** Picks a station the way a person does: types its name, then clicks it in the list. */
export async function chooseStation(page: Page, name: string): Promise<void> {
  await page.getByLabel('Station', { exact: true }).fill(name);
  await page.getByRole('option', { name, exact: true }).click();
}
