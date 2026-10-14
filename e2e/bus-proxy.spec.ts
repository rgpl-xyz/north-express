import { expect, test } from '@playwright/test';

// nginx answers these itself, before Digitransit is asked, so they need no API key. There
// is no proxy under `ng serve`, so they run only against a build behind nginx.
test.skip(!process.env['E2E_BASE_URL'], 'needs nginx: set E2E_BASE_URL');

test('the bus proxy refuses a station id Digitransit would not write', async ({ request }) => {
  for (const id of ['a%22b', 'MATKA:1%20x', '', 'A'.repeat(61), 'a%22b&id=MATKA:358750']) {
    const response = await request.get(`/api/buses/departures?id=${id}`);
    expect(response.status(), id).toBe(400);
  }
});

test('the bus proxy answers GET only', async ({ request }) => {
  expect((await request.post('/api/buses/stations')).status()).toBe(403);
  expect((await request.post('/api/buses/departures?id=MATKA:358750')).status()).toBe(403);
});

test('the bus proxy has no other addresses', async ({ request }) => {
  expect((await request.get('/api/buses/graphql')).status()).toBe(404);
});
