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

test('the home page is in its HTML, for crawlers that run no scripts', async ({ page }) => {
  const home = await page.request.get('/home');

  expect(home.ok()).toBe(true);
  const html = await home.text();
  expect(html).toContain('Welcome, traveller');
  expect(html).toContain('Questions or bugs?');
});

test('the home page is taken over as it is, not drawn again, and without errors', async ({
  page,
}) => {
  // Headings the browser removes: drawing the page again would throw the built ones away.
  await page.addInitScript(() => {
    const removed: string[] = [];
    (window as unknown as { removedHeadings: string[] }).removedHeadings = removed;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (node instanceof Element && (node.matches('h1, h2') || node.querySelector('h1, h2'))) {
            removed.push(node.tagName);
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/home');
  await expect(page.getByRole('heading', { name: 'Welcome, traveller' })).toBeVisible();
  await page.getByRole('button', { name: 'Departures' }).click();
  await expect(page.getByRole('link', { name: 'Buses' })).toBeVisible();

  const removed = await page.evaluate(
    () => (window as unknown as { removedHeadings: string[] }).removedHeadings,
  );
  expect(removed).toEqual([]);
  expect(errors).toEqual([]);
});

test('the root sends a crawler to the home page', async ({ page }) => {
  test.skip(!process.env['E2E_BASE_URL'], 'the redirect is nginx’s: set E2E_BASE_URL');

  const root = await page.request.get('/', { maxRedirects: 0 });

  expect(root.status()).toBe(301);
  expect(root.headers()['location']).toMatch(/\/home$/);
});
