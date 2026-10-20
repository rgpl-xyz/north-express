import { expect, test } from './fixtures';

test('robots.txt lets crawlers in and names the sitemap', async ({ page }) => {
  const robots = await page.request.get('/robots.txt');

  expect(robots.ok()).toBe(true);
  expect(robots.headers()['content-type']).toMatch(/^text\/plain/);
  const text = await robots.text();
  expect(text).toContain('Allow: /');
  expect(text).toContain('Sitemap: https://north-express.app.rgpl.xyz/sitemap.xml');
});

test('the sitemap lists the home page and both boards', async ({ page }) => {
  const sitemap = await page.request.get('/sitemap.xml');

  expect(sitemap.ok()).toBe(true);
  expect(sitemap.headers()['content-type']).toMatch(/xml/);
  const pages = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc);
  expect(pages).toEqual([
    'https://north-express.app.rgpl.xyz/home',
    'https://north-express.app.rgpl.xyz/departures/trains',
    'https://north-express.app.rgpl.xyz/departures/buses',
  ]);
});
