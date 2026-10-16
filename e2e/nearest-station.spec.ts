import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const field = (page: Page) => page.getByLabel('Station', { exact: true });
const nearestButton = (page: Page) => page.getByRole('button', { name: 'Nearest station' });

test.describe('with the location shared', () => {
  // About 700 m north of Pasila station.
  test.use({
    geolocation: { latitude: 60.2052, longitude: 24.9335 },
    permissions: ['geolocation'],
  });

  test('Nearest station picks the closest train station and says how far it is', async ({
    page,
  }) => {
    await page.goto('/departures/trains');
    await nearestButton(page).click();

    await expect(field(page)).toHaveValue('Pasila');
    await expect(page.getByText(/Pasila is \d+ m from you\./)).toBeVisible();
    await expect(page).toHaveURL(/\?station=PSL$/);
  });

  test('on the bus board it picks the closest bus station', async ({ page, context }) => {
    // Next to Tapiola (M).
    await context.setGeolocation({ latitude: 60.176, longitude: 24.8045 });
    await page.goto('/departures/buses');
    await nearestButton(page).click();

    await expect(field(page)).toHaveValue('Tapiola (M)');
  });
});

test.describe('with the location blocked', () => {
  test.use({ permissions: [] });

  test('says the location is blocked, and the search still works', async ({ page }) => {
    await page.goto('/departures/trains');
    await nearestButton(page).click();

    await expect(page.getByText('Location is blocked for this site.')).toBeVisible();
    await expect(field(page)).toHaveValue('');
    await expect(field(page)).toBeEnabled();
  });
});
