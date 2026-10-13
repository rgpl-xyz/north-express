import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const picker = (page: Page) => page.getByLabel('Station', { exact: true });
const alertBox = (page: Page) => page.locator('.alert');
const departureRows = (page: Page) =>
  page.getByRole('row').filter({ has: page.getByRole('gridcell') });

test('stations that fail to load can be loaded with Try again', async ({ page, digitraffic }) => {
  digitraffic.fail('stations');
  await page.goto('/departures/trains');

  await expect(alertBox(page)).toContainText("Couldn't load stations.");
  await expect(page.locator('.toast')).toHaveCount(0);

  digitraffic.recover();
  await page.getByRole('button', { name: 'Try again' }).click();

  await expect(alertBox(page)).toHaveCount(0);
  await expect(picker(page)).toBeFocused();
  await picker(page).selectOption({ label: 'Tampere' });
  await expect(departureRows(page)).toHaveCount(4);
});

test('a failed refresh keeps the departures, marked with the time they are from', async ({
  page,
  digitraffic,
}) => {
  await page.goto('/departures/trains');
  await picker(page).selectOption({ label: 'Tampere' });
  await expect(departureRows(page)).toHaveCount(4);

  digitraffic.fail('departures');
  await page.getByRole('button', { name: 'Refresh' }).click();

  await expect(alertBox(page)).toContainText(
    /Couldn't refresh\. Showing departures from \d{2}:\d{2}\./,
  );
  await expect(departureRows(page)).toHaveCount(4);
  await expect(page.locator('.toast')).toHaveCount(0);

  digitraffic.recover();
  await page.getByRole('button', { name: 'Try again' }).click();

  await expect(alertBox(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeFocused();
});

test('departures that fail with nothing to keep say so', async ({ page, digitraffic }) => {
  digitraffic.fail('departures');
  await page.goto('/departures/trains');
  await picker(page).selectOption({ label: 'Tampere' });

  await expect(alertBox(page)).toContainText("Couldn't load departures from Tampere.");
  await expect(departureRows(page)).toHaveCount(0);

  digitraffic.recover();
  await page.getByRole('button', { name: 'Try again' }).click();

  await expect(alertBox(page)).toHaveCount(0);
  await expect(departureRows(page)).toHaveCount(4);
});
