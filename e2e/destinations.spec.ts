import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const field = (page: Page) => page.getByLabel('Station', { exact: true });
/** The note on the board, and its words in the grid's live region. */
const note = (page: Page) => page.locator('.destination-note');
const announced = (page: Page) =>
  page.getByRole('status').filter({ hasText: "Can't show departures from" });
const LAHTI_NOTE = "Can't show departures from Lahti. It isn't in the list of bus stations.";

/** Focuses the Departs cell of a destination's row, as a click does, then moves right to it. */
async function focusDestination(page: Page, destination: string): Promise<void> {
  await page
    .getByRole('row')
    .filter({ hasText: destination })
    .getByRole('gridcell')
    .first()
    .click();
  await page.keyboard.press('ArrowRight');
}

test('a destination opens the board of the station the train ends at', async ({ page }) => {
  await page.goto('/departures/trains?station=TPE');
  const helsinki = page.getByRole('link', { name: 'Helsinki', exact: true });
  await expect(helsinki).toHaveAttribute('href', '/departures/trains?station=HKI');

  await helsinki.click();

  await expect(page).toHaveURL(/\/departures\/trains\?station=HKI$/);
  await expect(field(page)).toHaveValue('Helsinki');
  // The link went with the old rows, so focus is on the heading, above the station field.
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();

  await page.goBack();
  await expect(field(page)).toHaveValue('Tampere');
});

test('Enter on a Destination cell opens its board', async ({ page }) => {
  await page.goto('/departures/trains?station=TPE');
  await focusDestination(page, 'Oulu');

  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\?station=OL$/);
  await expect(field(page)).toHaveValue('Oulu');
});

test('a bus destination opens the station where the bus ends', async ({ page }) => {
  await page.goto('/departures/buses?station=MATKA:358750');
  const helsinki = page.getByRole('link', { name: 'Helsinki', exact: true }).first();
  await expect(helsinki).toHaveAttribute(
    'title',
    'Departures from Kamppi (kaukoliikenneterminaali)',
  );

  await helsinki.click();

  await expect(page).toHaveURL(/\/departures\/buses\?station=HSL:1000015$/);
  await expect(field(page)).toHaveValue('Kamppi (kaukoliikenneterminaali)');
});

test('a destination with no board says so under it, until Escape or a press elsewhere', async ({
  page,
}) => {
  // An uncaught error would show as "Something went wrong" to the traveller.
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  await page.goto('/departures/buses?station=MATKA:358750');
  // Lahti's bus station isn't in the stations the tests list.
  const lahti = page.getByRole('button', { name: 'Lahti', exact: true });

  await lahti.click();
  await expect(note(page)).toHaveText(LAHTI_NOTE);
  await expect(announced(page)).toHaveText(LAHTI_NOTE);
  await expect(note(page)).toBeInViewport({ ratio: 1 });
  // On a line of its own: the departure after Lahti's moves down, out from under it.
  const shown = await note(page).boundingBox();
  const next = await page.getByRole('button', { name: 'Turku', exact: true }).boundingBox();
  expect(next?.y ?? 0).toBeGreaterThan((shown?.y ?? Infinity) + (shown?.height ?? 0));

  await page.keyboard.press('Escape');
  await expect(note(page)).toHaveCount(0);
  await expect(announced(page)).toHaveCount(0);

  await lahti.click();
  await expect(note(page)).toHaveCount(1);
  await page.getByText('Times are Finland local time').click();
  await expect(note(page)).toHaveCount(0);

  // A second press on the same destination takes the note away again.
  await lahti.click();
  await lahti.click();
  await expect(note(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Enter on a destination with no board says so', async ({ page }) => {
  await page.goto('/departures/buses?station=MATKA:358750');
  await focusDestination(page, 'Lahti');

  await page.keyboard.press('Enter');

  await expect(note(page)).toContainText("Can't show departures from Lahti");
  await page.keyboard.press('Escape');
  await expect(note(page)).toHaveCount(0);
});
