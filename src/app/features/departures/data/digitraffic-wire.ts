/*
 * The Digitraffic rail API: the addresses this app calls and the shapes they return,
 * limited to the fields it reads. Private to the data folder and the test fakes (lint
 * enforces it); UI code uses the view types in departures.models.ts.
 */

export const API_URL = 'https://rata.digitraffic.fi/api/v1';

export const STATIONS_URL = `${API_URL}/metadata/stations`;

const NEXT_DEPARTURES_QUERY =
  'arrived_trains=0&arriving_trains=0&departed_trains=0&departing_trains=20&include_nonstopping=false';

/** Live trains for a station, limited to the next 20 departures. */
export function departuresUrl(stationCode: string): string {
  return `${API_URL}/live-trains/station/${encodeURIComponent(stationCode)}?${NEXT_DEPARTURES_QUERY}`;
}

export interface DigitrafficStation {
  readonly stationName: string;
  readonly stationShortCode: string;
  readonly passengerTraffic: boolean;
  readonly countryCode: string;
  readonly type: string;
}

export type TimeTableRowType = 'ARRIVAL' | 'DEPARTURE';

export interface DigitrafficTimeTableRow {
  readonly stationShortCode: string;
  readonly type: TimeTableRowType;
  readonly trainStopping: boolean;
  readonly commercialStop?: boolean;
  readonly commercialTrack?: string;
  readonly cancelled: boolean;
  readonly scheduledTime: string;
  readonly liveEstimateTime?: string;
  readonly actualTime?: string;
  readonly differenceInMinutes?: number;
}

export interface DigitrafficTrain {
  readonly trainNumber: number;
  readonly departureDate: string;
  readonly trainType: string;
  readonly trainCategory: string;
  /** Empty string for trains that are not on a commuter line. */
  readonly commuterLineID?: string;
  readonly cancelled: boolean;
  readonly timeTableRows: readonly DigitrafficTimeTableRow[];
}
