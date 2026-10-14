import { PASILA_RING_TRAIN_FIXTURE } from '../src/testing/digitraffic-fixtures';
import { expect, test } from './fixtures';

test.use({ viewport: { width: 390, height: 844 } });

test('on a phone the board keeps the time, destination, track and status on screen', async ({
  page,
}) => {
  await page.goto('/departures/trains');
  await page.getByLabel('Station', { exact: true }).selectOption({ label: 'Tampere' });

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
  await page.getByLabel('Station', { exact: true }).selectOption({ label: 'Pasila' });

  const destination = page.getByRole('gridcell', { name: 'Lentoasema (Airport)' });
  await expect(destination).toBeVisible();
  const cutOff = await destination.evaluate(
    (cell) => cell.scrollWidth > cell.clientWidth || cell.scrollHeight > cell.clientHeight,
  );
  expect(cutOff, 'the destination is cut off').toBe(false);
});
