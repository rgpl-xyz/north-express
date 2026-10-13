import type { Page, Route } from '@playwright/test';
import {
  API_URL,
  type DigitrafficTrain,
  STATIONS_URL,
  departuresUrl,
} from '../src/app/features/departures/data/digitraffic-wire';
import {
  PASILA_RING_TRAIN_FIXTURE,
  STATIONS_FIXTURE,
  TAMPERE_DEPARTURES_FIXTURE,
} from '../src/testing/digitraffic-fixtures';

// Playwright answers CORS preflights itself while it intercepts requests, so only the
// responses need this.
const CORS_HEADERS = { 'access-control-allow-origin': '*' };

/** Stations with captured trains; every other station in the fixture has none. */
const CAPTURED_DEPARTURES: ReadonlyMap<string, readonly DigitrafficTrain[]> = new Map([
  ['TPE', TAMPERE_DEPARTURES_FIXTURE],
  ['PSL', PASILA_RING_TRAIN_FIXTURE],
]);

type RequestKind = 'stations' | 'departures';

/**
 * Stands in for Digitraffic in the e2e tests. It answers every request the app can make
 * from the responses saved in src/testing, and can fail them as if Digitraffic were
 * unreachable. Any other request gets a 404 and fails the test (see fixtures.ts).
 */
export class FakeDigitraffic {
  /** Each station's live trains, keyed by the exact URL the app requests them from. */
  private readonly departures = new Map<string, readonly DigitrafficTrain[]>(
    STATIONS_FIXTURE.map((station) => [
      departuresUrl(station.stationShortCode),
      CAPTURED_DEPARTURES.get(station.stationShortCode) ?? [],
    ]),
  );
  private readonly failing = new Set<RequestKind>();
  private readonly unanswered: string[] = [];

  /** Answers every Digitraffic request the page makes. */
  async serve(page: Page): Promise<void> {
    await page.route(`${API_URL}/**`, (route) => this.answer(route));
  }

  /** From now on, the station's departures are these trains. */
  setDepartures(stationCode: string, trains: readonly DigitrafficTrain[]): void {
    this.departures.set(departuresUrl(stationCode), trains);
  }

  /** Requests of this kind fail until recover() is called. */
  fail(kind: RequestKind): void {
    this.failing.add(kind);
  }

  recover(): void {
    this.failing.clear();
  }

  /** URLs the app requested that the fake has no answer for. */
  unexpectedRequests(): readonly string[] {
    return [...this.unanswered];
  }

  private async answer(route: Route): Promise<void> {
    const url = route.request().url();
    if (url === STATIONS_URL) {
      await this.respond(route, 'stations', STATIONS_FIXTURE);
      return;
    }
    const trains = this.departures.get(url);
    if (trains) {
      await this.respond(route, 'departures', trains);
      return;
    }
    this.unanswered.push(url);
    await route.fulfill({
      status: 404,
      headers: CORS_HEADERS,
      json: { message: `Not faked: ${url}` },
    });
  }

  private async respond(route: Route, kind: RequestKind, body: unknown): Promise<void> {
    if (this.failing.has(kind)) {
      await route.abort('failed');
      return;
    }
    await route.fulfill({ status: 200, headers: CORS_HEADERS, json: body });
  }
}
