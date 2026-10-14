import { chooseStation, expect, test } from './fixtures';

const field = (page: import('@playwright/test').Page) =>
  page.getByLabel('Station', { exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto('/departures/trains');
  await expect(field(page)).toBeEnabled();
});

test('a station is found without its accents, or by its code', async ({ page }) => {
  await field(page).fill('ahtari');
  await expect(page.getByRole('option')).toHaveText(['Ähtäri']);

  await field(page).fill('tpe');
  await expect(page.getByRole('option').first()).toHaveText('Tampere');
});

test('the arrow keys and Enter pick a station', async ({ page }) => {
  await field(page).fill('tamp');
  await field(page).press('ArrowDown');
  await field(page).press('Enter');

  await expect(field(page)).toHaveValue('Tampere');
  await expect(page.getByRole('row').filter({ hasText: 'Oulu' })).toBeVisible();
  await expect(page.getByRole('listbox')).toHaveCount(0);
});

test('Enter alone takes the first match', async ({ page }) => {
  await field(page).fill('pasi');
  await field(page).press('Enter');

  await expect(field(page)).toHaveValue('Pasila');
});

test('Escape puts the chosen station back', async ({ page }) => {
  await chooseStation(page, 'Tampere');
  await field(page).fill('hel');
  await field(page).press('Escape');

  await expect(field(page)).toHaveValue('Tampere');
});

test('text no station has is answered, not just left empty', async ({ page }) => {
  await field(page).fill('xyz');

  // Shown under the field, and read out by the live region too.
  await expect(page.locator('.no-match')).toHaveText('No station matches "xyz".');
  await expect(page.getByRole('option')).toHaveCount(0);
});

test('the chevron opens the whole list', async ({ page }) => {
  await page.getByRole('button', { name: 'Show all stations' }).click();

  await expect(page.getByRole('option')).toHaveCount(12);
  await expect(field(page)).toBeFocused();
});

test('a station clicked in the list leaves focus in the field', async ({ page }) => {
  await field(page).fill('tamp');
  await page.getByRole('option', { name: 'Tampere' }).click();

  await expect(field(page)).toHaveValue('Tampere');
  await expect(field(page)).toBeFocused();
});

test('on a phone, a tapped station lets the keyboard close and shows its board', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'touch screens only');
  await field(page).fill('tamp');
  await page.getByRole('option', { name: 'Tampere' }).tap();

  await expect(field(page)).toHaveValue('Tampere');
  await expect(field(page)).not.toBeFocused();
  await expect(page.getByRole('row').filter({ hasText: 'Oulu' })).toBeVisible();
});
