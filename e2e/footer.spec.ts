import { expect, test } from './fixtures';

// Only deploy/deploy.sh names the commit; every other build, CI's included, is dev.
const DEPLOYED = process.env['E2E_BASE_URL']?.startsWith('https://') ?? false;

test('the footer names the build, linked to its commit once deployed', async ({ page }) => {
  await page.goto('/home');
  const footer = page.locator('footer');

  if (DEPLOYED) {
    await expect(footer.getByRole('link', { name: /^[0-9a-f]{7}$/ })).toHaveAttribute(
      'href',
      /^https:\/\/github\.com\/rgpl-xyz\/north-express\/commit\/[0-9a-f]{40}$/,
    );
  } else {
    await expect(footer).toContainText(/Build\s+dev/);
  }
});
