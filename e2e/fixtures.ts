import { type Page, test as base, expect } from '@playwright/test';
import { FakeDigitraffic } from './fake-digitraffic';
import { FakeDigitransit } from './fake-digitransit';

export { expect };

/**
 * Playwright's test with Digitraffic and the bus proxy faked. The fakes start in every
 * test, even ones that never use them, so no test can reach the real APIs, and a test
 * fails if the app made a request a fake has no answer for.
 */
export const test = base.extend<{ digitraffic: FakeDigitraffic; digitransit: FakeDigitransit }>({
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
  digitransit: [
    async ({ page }, use) => {
      const digitransit = new FakeDigitransit();
      await digitransit.serve(page);
      await use(digitransit);
      expect(
        digitransit.unexpectedRequests(),
        'Bus proxy requests the fake has no answer for',
      ).toEqual([]);
    },
    { auto: true },
  ],
});

/** Matches a name that is `name`, or starts with it then a comma, as "Tampere, Tammerfors" does. */
export function startingWith(name: string): RegExp {
  const literal = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${literal}(, |$)`);
}

/**
 * Picks a station the way a person does: types its name, then clicks it in the list. An
 * option's name is the station's name, then its other names, as in "Tampere, Tammerfors".
 */
export async function chooseStation(page: Page, name: string): Promise<void> {
  await page.getByLabel('Station', { exact: true }).fill(name);
  await page.getByRole('option', { name: startingWith(name) }).click();
}
