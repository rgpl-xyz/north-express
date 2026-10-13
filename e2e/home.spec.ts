import { expect, test } from './fixtures';

test('the home page renders the welcome and help cards', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/home$/);
  await expect(page).toHaveTitle('Home | The North Express');
  await expect(page.getByRole('heading', { name: 'Welcome, traveller' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Questions or bugs?' })).toBeVisible();
  await expect(page.getByText('Download our app')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Fintraffic / digitraffic.fi' })).toHaveAttribute(
    'href',
    'https://www.digitraffic.fi/en/',
  );
});
