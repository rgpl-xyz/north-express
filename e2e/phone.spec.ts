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
