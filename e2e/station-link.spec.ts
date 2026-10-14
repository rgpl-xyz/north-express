import { chooseStation, expect, test } from './fixtures';

const field = (page: import('@playwright/test').Page) =>
  page.getByLabel('Station', { exact: true });

test('the station picked is in the address, and a reload keeps it', async ({ page }) => {
  await page.goto('/departures/trains');
  await chooseStation(page, 'Tampere');

  await expect(page).toHaveURL(/\/departures\/trains\?station=TPE$/);
  await page.reload();
  await expect(field(page)).toHaveValue('Tampere');
  await expect(page.getByRole('row').filter({ hasText: 'Oulu' })).toBeVisible();
});

test('a link to a station opens its board, and Back returns to the one before', async ({
  page,
}) => {
  await page.goto('/departures/trains?station=PSL');
  await expect(field(page)).toHaveValue('Pasila');

  await chooseStation(page, 'Tampere');
  await page.goBack();

  await expect(field(page)).toHaveValue('Pasila');
});
