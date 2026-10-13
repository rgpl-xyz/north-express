/*
 * Shapes returned by the Digitraffic rail API (https://rata.digitraffic.fi/api/v1),
 * limited to the fields this app reads. Private to the data folder: only the
 * Digitraffic adapter and its mapping use them.
 */

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
