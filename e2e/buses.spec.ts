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

test('the Bus column says who runs each bus, without the Oy of its company name', async ({
  page,
}) => {
  await page.goto('/departures/buses?station=MATKA:358750');

  await expect(rowsWith(page, 'OB37')).toContainText('OB37, OnniBus');
  await expect(rowsWith(page, 'V130').first()).toContainText('V130, Valkeakosken Liikenne');
  await expect(page.locator('.board')).not.toContainText(' Oy');
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

test('the first departure after midnight is marked as tomorrow', async ({ page }) => {
  // The time the fixtures were captured: 17:40 on 14 October 2026 in Finland.
  await page.clock.setFixedTime(new Date('2026-10-14T14:40:00.000Z'));
  await page.goto('/departures/buses?station=MATKA:358750');

  const tomorrow = page.getByRole('row').filter({ hasText: 'Tomorrow' });
  await expect(tomorrow).toHaveCount(1);
  // A line of its own, right above the departure.
  const rows = await page.getByRole('row').allTextContents();
  expect(rows[rows.findIndex((row) => row.includes('Tomorrow')) + 1]).toContain('02:15');

  // So the time stays level with the rest of its row.
  const night = page.getByRole('row').filter({ hasText: '02:15' });
  const middle = async (part: string) => {
    const box = await night.locator(part).boundingBox();
    return (box?.y ?? 0) + (box?.height ?? 0) / 2;
  };
  expect(Math.abs((await middle('.departs')) - (await middle('.destination-link')))).toBeLessThan(
    3,
  );

  await page.getByRole('columnheader', { name: 'Destination' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Tomorrow' })).toHaveCount(0);
});
