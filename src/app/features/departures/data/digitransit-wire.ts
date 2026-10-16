/*
 * Digitransit's routing API, as the app reaches it: through /api/buses on its own server,
 * where nginx adds the API key and sends the GraphQL queries (deploy/nginx/north-express.conf).
 * The shapes are limited to the fields those queries ask for. Private to the data folder and
 * the test fakes (lint enforces it); UI code uses the view types in departures.models.ts.
 */

export const BUS_API_URL = '/api/buses';

export const BUS_STATIONS_URL = `${BUS_API_URL}/stations`;

/** A station id nginx passes on; it checks the same pattern and answers 400 to anything else. */
export const STATION_ID = /^[A-Za-z0-9_:.-]{1,60}$/;

/**
 * The next 20 departures from one Digitransit station. Not percent-encoded: ids match
 * STATION_ID, and nginx checks the raw query string, so an encoded ":" would be refused.
 */
export function busDeparturesUrl(stationId: string): string {
  return `${BUS_API_URL}/departures?id=${stationId}`;
}

/** A GraphQL answer: `data`, or `errors` with `data` null, still with HTTP 200. */
export interface GraphQlResponse<T> {
  readonly data?: T | null;
  readonly errors?: readonly { readonly message: string }[];
}

export interface DigitransitStation {
  readonly gtfsId: string;
  readonly name: string;
  /** The name in Swedish where the feed has one; otherwise the same as name, or null. */
  readonly sv?: string | null;
  /** BUS, RAIL, FERRY, SUBWAY, TRAM, or null when the station mixes them. */
  readonly vehicleMode: string | null;
  readonly lat: number;
  readonly lon: number;
}

export type StationsResponse = GraphQlResponse<{
  readonly stations: readonly DigitransitStation[];
}>;

export type RealtimeState = 'SCHEDULED' | 'UPDATED' | 'CANCELED' | 'ADDED' | 'MODIFIED';

export interface DigitransitStoptime {
  /** The stop within the station, such as one platform. */
  readonly stop: { readonly gtfsId: string; readonly platformCode: string | null };
  /** Start of the service day in Unix seconds; the departure times count from it. */
  readonly serviceDay: number;
  readonly scheduledDeparture: number;
  /** Same as scheduledDeparture when there is no live data. */
  readonly realtimeDeparture: number;
  readonly realtime: boolean;
  readonly realtimeState: RealtimeState;
  readonly headsign: string | null;
  readonly trip: {
    readonly gtfsId: string;
    /** The trip's last stop, where it arrives, and when, counted like the departures. */
    readonly arrivalStoptime: {
      readonly scheduledArrival: number;
      readonly stop: { readonly gtfsId: string; readonly name: string };
    } | null;
    readonly route: {
      readonly shortName: string | null;
      readonly agency: { readonly name: string };
    };
  };
}

export type DeparturesResponse = GraphQlResponse<{
  readonly station: {
    readonly stoptimesWithoutPatterns: readonly DigitransitStoptime[];
  } | null;
}>;
