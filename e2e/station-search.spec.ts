import { chooseStation, expect, test } from './fixtures';

const field = (page: import('@playwright/test').Page) =>
  page.getByLabel('Station', { exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto('/departures/trains');
  await expect(field(page)).toBeEnabled();
});

test('a station is found without its accents, or by its code', async ({ page }) => {
  await field(page).fill('ahtari');
  // An option is named by its Swedish name too, where there is one.
  await expect(page.getByRole('option')).toHaveCount(1);
  await expect(page.getByRole('option')).toHaveAccessibleName('Ähtäri, Etseri');

  await field(page).fill('tpe');
  await expect(page.getByRole('option').first()).toHaveAccessibleName('Tampere, Tammerfors');
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

  // Every passenger station in the fixture.
  await expect(page.getByRole('option')).toHaveCount(13);
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

for (const width of [390, 1280]) {
  test(`at ${width}px the longest station name fits the field, and fills it`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/departures/buses');
    await chooseStation(page, 'Kantasataman paikallisliikenneterminaali (Kotka)');
    const field = page.getByLabel('Station', { exact: true });
    await field.blur();

    await expect
      .poll(() => field.evaluate((input) => input.scrollWidth <= input.clientWidth))
      .toBe(true);
    // Not shrunk more than it needs: the name fills most of the field's room.
    const filled = await field.evaluate((input) => {
      const style = getComputedStyle(input);
      const probe = document.createElement('span');
      Object.assign(probe.style, {
        position: 'absolute',
        whiteSpace: 'pre',
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontStyle: style.fontStyle,
        fontWeight: style.fontWeight,
      });
      probe.textContent = input.value;
      document.body.append(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return width / (input.clientWidth - parseFloat(style.paddingRight));
    });
    expect(filled).toBeGreaterThan(0.85);
  });
}

test('a short station name keeps the sign size', async ({ page }) => {
  await page.goto('/departures/trains');
  const field = page.getByLabel('Station', { exact: true });
  const signSize = await field.evaluate((input) => getComputedStyle(input).fontSize);

  await chooseStation(page, 'Tampere');
  await field.blur();

  expect(await field.evaluate((input) => getComputedStyle(input).fontSize)).toBe(signSize);
});

test('a bilingual station is found by its Swedish name, which the list shows too', async ({
  page,
}) => {
  await page.goto('/departures/trains');
  await field(page).fill('tammerfors');

  const option = page.getByRole('option');
  await expect(option).toHaveCount(1);
  await expect(option).toHaveAccessibleName('Tampere, Tammerfors');
  // The Swedish name on its own line, below the Finnish one.
  const finnish = await option.locator('.name').boundingBox();
  const swedish = await option.locator('.aliases').boundingBox();
  expect(swedish?.y).toBeGreaterThanOrEqual((finnish?.y ?? 0) + (finnish?.height ?? 0) - 1);

  await option.click();
  await expect(field(page)).toHaveValue('Tampere');
});
