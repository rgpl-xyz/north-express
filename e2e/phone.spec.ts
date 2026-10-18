import { PASILA_RING_TRAIN_FIXTURE } from '../src/testing/digitraffic-fixtures';
import { chooseStation, expect, test } from './fixtures';

test.use({ viewport: { width: 390, height: 844 } });

test('on a phone the board keeps the time, destination, track and status on screen', async ({
  page,
}) => {
  await page.goto('/departures/trains');
  await chooseStation(page, 'Tampere');

  const late = page.getByRole('row').filter({ hasText: 'Oulu' });
  await expect(late).toContainText('2 min late');
  await expect(page.getByRole('columnheader')).toHaveText([
    'Departs',
    'Destination',
    'Track',
    'Status',
  ]);
  for (const cell of await late.getByRole('gridcell').all()) {
    await expect(cell).toBeInViewport({ ratio: 1 });
  }
});

test('on a phone the board draws its phone columns from the start', async ({ page }) => {
  // The column names the first time the board's header is drawn, before any switch.
  await page.addInitScript(() => {
    const drawn: string[][] = [];
    (window as unknown as { headersDrawn: string[][] }).headersDrawn = drawn;
    new MutationObserver((_, observer) => {
      const names = [...document.querySelectorAll('[role="columnheader"]')].map(
        (header) => header.textContent?.trim() ?? '',
      );
      if (names.length > 0 && names.every(Boolean)) {
        drawn.push(names);
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true, characterData: true });
  });

  await page.goto('/departures/trains?station=TPE');
  await expect(page.getByRole('row').filter({ hasText: 'Oulu' })).toBeVisible();

  const drawn = await page.evaluate(
    () => (window as unknown as { headersDrawn: string[][] }).headersDrawn,
  );
  expect(drawn).toEqual([['Departs', 'Destination', 'Track', 'Status']]);
});

test('on a phone a long destination wraps rather than being cut off', async ({
  page,
  digitraffic,
}) => {
  // The ring train before it sets off, bound for the airport (see ring-trains.spec.ts).
  digitraffic.setDepartures(
    'PSL',
    PASILA_RING_TRAIN_FIXTURE.map((train) => ({
      ...train,
      timeTableRows: train.timeTableRows.map((row) => ({ ...row, actualTime: undefined })),
    })),
  );
  await page.goto('/departures/trains');
  await chooseStation(page, 'Pasila');

  const destination = page.getByRole('gridcell', { name: 'Lentoasema (Airport)' });
  await expect(destination).toBeVisible();
  const cutOff = await destination.evaluate(
    (cell) => cell.scrollWidth > cell.clientWidth || cell.scrollHeight > cell.clientHeight,
  );
  expect(cutOff, 'the destination is cut off').toBe(false);
});

test('on the narrowest phones each board fits, without scrolling sideways', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const [address, place] of [
    ['/departures/buses?station=MATKA:358750', 'Plat'],
    ['/departures/trains?station=TPE', 'Track'],
  ]) {
    await page.goto(address);
    await expect(page.getByRole('columnheader')).toHaveText([
      'Departs',
      'Destination',
      place,
      'Status',
    ]);
    const board = await page.locator('.ag-root-wrapper').boundingBox();
    const status = await page.getByRole('columnheader', { name: 'Status' }).boundingBox();
    expect((status?.x ?? 0) + (status?.width ?? 0)).toBeLessThanOrEqual(
      (board?.x ?? 0) + (board?.width ?? 0),
    );
  }
});

test('on a phone the bus board shows its column names in full', async ({ page }) => {
  await page.goto('/departures/buses');
  await chooseStation(page, 'Tampere, linja-autoasema');

  const headers = page.getByRole('columnheader');
  await expect(headers).toHaveText(['Departs', 'Destination', 'Platform', 'Status']);
  for (const name of await headers.locator('.ag-header-cell-text').all()) {
    const cutOff = await name.evaluate((text) => text.scrollWidth > text.clientWidth);
    expect(cutOff, `${await name.textContent()} is cut off`).toBe(false);
  }
});
