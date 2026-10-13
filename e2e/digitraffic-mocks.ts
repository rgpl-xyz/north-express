import type { Page, Route } from '@playwright/test';
import tampereDepartures from '../src/testing/digitraffic-departures-tpe.json';
import stations from '../src/testing/digitraffic-stations.json';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'Digitraffic-User, Content-Type',
};

const RESPONSES: Readonly<Record<string, unknown>> = {
  '/api/v1/metadata/stations': stations,
  '/api/v1/live-trains/station/TPE': tampereDepartures,
};

async function answer(route: Route): Promise<void> {
  const request = route.request();
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return;
  }

  const body = RESPONSES[new URL(request.url()).pathname];
  await route.fulfill(
    body === undefined
      ? { status: 404, headers: CORS_HEADERS, json: { message: 'Not mocked' } }
      : { status: 200, headers: CORS_HEADERS, json: body },
  );
}

/**
 * Serves the captured fixtures from src/testing for every Digitraffic request,
 * so the tests are fast, repeatable and never call the real API.
 */
export async function mockDigitraffic(page: Page): Promise<void> {
  await page.route('https://rata.digitraffic.fi/**', answer);
}
