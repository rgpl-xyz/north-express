import { chooseStation, expect, test } from './fixtures';

test('choosing a station shows its departures', async ({ page }) => {
  await page.goto('/departures/trains');

  await expect(page).toHaveTitle('Trains | The North Express');
  await expect(page.getByText('Choose a station to see its next departures.')).toBeVisible();

  const picker = page.getByLabel('Station', { exact: true });
  await expect(picker).toBeEnabled();

  const departuresRequest = page.waitForRequest(
    (request) => request.method() === 'GET' && request.url().includes('/live-trains/station/TPE'),
  );
  await chooseStation(page, 'Tampere');
  expect((await departuresRequest).headers()['digitraffic-user']).toBe('rgpl-xyz/north-express');

  // Fixture times are UTC; Tampere is UTC+3 on 13 October 2026.
  const late = page.getByRole('row').filter({ hasText: 'IC 25' });
  await expect(late).toContainText('14:02');
  await expect(late).toContainText('14:03');
  await expect(late).toContainText('Oulu');
  await expect(late).toContainText('2 min late');

  await expect(page.getByRole('row').filter({ hasText: 'Commuter M' })).toContainText('Nokia');
  await expect(page.getByText('T 3816')).toHaveCount(0);
  await expect(page.getByText('Times are Finland local time')).toBeVisible();
  await expect(page.getByText(/Last updated \d{2}:\d{2}:\d{2}/)).toBeVisible();
});

test('a station with no trains says so', async ({ page }) => {
  await page.goto('/departures/trains');
  await chooseStation(page, 'Ähtäri');

  await expect(page.getByText('No departures from Ähtäri in the coming hours.')).toBeVisible();
  await expect(page.getByRole('gridcell')).toHaveCount(0);
});
