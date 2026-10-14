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

test('the page lists its icons, and each one is served as an image', async ({ page }) => {
  await page.goto('/');

  const icons = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
  expect(icons).toHaveLength(3);
  for (const icon of icons) {
    const response = await page.request.get(icon);
    expect(response.ok(), icon).toBe(true);
    expect(response.headers()['content-type'], icon).toMatch(/^image\//);
  }
});
