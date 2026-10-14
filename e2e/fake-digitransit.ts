import type { Page, Route } from '@playwright/test';
import {
  BUS_API_URL,
  BUS_STATIONS_URL,
  type DeparturesResponse,
  busDeparturesUrl,
} from '../src/app/features/departures/data/digitransit-wire';
import { BUS_DEPARTURES_FIXTURES, BUS_STATIONS_FIXTURE } from '../src/testing/digitransit-fixtures';

const NO_DEPARTURES: DeparturesResponse = { data: { station: { stoptimesWithoutPatterns: [] } } };

/**
 * Stands in for the app's /api/buses proxy in the e2e tests, answering from the responses
 * saved in src/testing. Stations without saved departures have none. Any other request
 * gets a 404 and fails the test (see fixtures.ts).
 */
export class FakeDigitransit {
  /** Each station's departures, keyed by the address the app requests them from. */
  private readonly departures = new Map<string, DeparturesResponse>(
    (BUS_STATIONS_FIXTURE.data?.stations ?? []).map((station) => [
      busDeparturesUrl(station.gtfsId),
      BUS_DEPARTURES_FIXTURES.get(station.gtfsId) ?? NO_DEPARTURES,
    ]),
  );
  private readonly unanswered: string[] = [];

  /** Answers every bus request the page makes. */
  async serve(page: Page): Promise<void> {
    await page.route(`**${BUS_API_URL}/**`, (route) => this.answer(route));
  }

  /** Addresses the app requested that the fake has no answer for. */
  unexpectedRequests(): readonly string[] {
    return [...this.unanswered];
  }

  private async answer(route: Route): Promise<void> {
    const url = new URL(route.request().url());
    const address = url.pathname + url.search;
    const body = address === BUS_STATIONS_URL ? BUS_STATIONS_FIXTURE : this.departures.get(address);
    if (body) {
      await route.fulfill({ json: body });
      return;
    }
    this.unanswered.push(address);
    await route.fulfill({ status: 404, json: { message: `Not faked: ${address}` } });
  }
}
