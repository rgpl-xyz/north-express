import { type Page } from '@playwright/test';
import { chooseStation, expect, test } from './fixtures';

const field = (page: Page) => page.getByLabel('Station', { exact: true });
const rowsWith = (page: Page, text: string) => page.getByRole('row').filter({ hasText: text });

test('the Departures menu opens the bus board', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('button', { name: 'Departures' }).click();
  await page.getByRole('link', { name: 'Buses' }).click();

  await expect(page).toHaveURL(/\/departures\/buses$/);
  await expect(page).toHaveTitle('Buses | The North Express');
  await expect(page.getByRole('heading', { level: 1, name: 'Bus departures' })).toBeVisible();
  await expect(field(page)).toBeEnabled();
});

test('a bus station shows its next buses, without the ones ending there', async ({ page }) => {
  await page.goto('/departures/buses');
  await chooseStation(page, 'Tampere, linja-autoasema');

  await expect(page.getByRole('columnheader')).toHaveText([
    'Departs',
    'Destination',
    'Platform',
    'Bus',
    'Status',
  ]);
  // OnniBus OB37 leaves for Lahti; the OB37 from Lahti ends here and is left out.
  const lahti = rowsWith(page, 'OB37');
  await expect(lahti).toHaveCount(1);
  await expect(lahti).toContainText('Lahti');
  await expect(lahti).toContainText('Scheduled');
  await expect(page).toHaveURL(/\?station=MATKA:358750$/);
});

test('a station that several feeds list is one station, with all of their buses', async ({
  page,
}) => {
  await page.goto('/departures/buses');
  await field(page).fill('Kuopio');

  await expect(page.getByRole('option')).toHaveText(['Kuopio, Matkakeskus']);
  await page.getByRole('option', { name: 'Kuopio, Matkakeskus' }).click();

  await expect(rowsWith(page, 'OB5').first()).toBeVisible();
  await expect(rowsWith(page, 'Pohjolan Matka').first()).toBeVisible();
  await expect(rowsWith(page, 'Tulo')).toHaveCount(0);
});

test('live data shows how late a bus is', async ({ page }) => {
  await page.goto('/departures/buses?station=HSL:2000002');

  await expect(field(page)).toHaveValue('Tapiola (M)');
  await expect(rowsWith(page, '4 min late')).toHaveCount(1);
  await expect(rowsWith(page, 'On time').first()).toBeVisible();
});

test('the footer credits Digitransit for the bus data', async ({ page }) => {
  await page.goto('/departures/buses');

  await expect(
    page.getByRole('link', { name: `© Digitransit ${new Date().getFullYear()}` }),
  ).toHaveAttribute('href', 'https://digitransit.fi/en/');
});
