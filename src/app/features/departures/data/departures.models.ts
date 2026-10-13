/*
 * Shapes returned by the Digitraffic rail API (https://rata.digitraffic.fi/api/v1),
 * limited to the fields this app reads.
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

/* What the app shows. */

export interface Station {
  readonly code: string;
  readonly name: string;
}

export type DepartureStatusKind = 'on-time' | 'late' | 'cancelled';

export interface DepartureStatus {
  readonly label: string;
  readonly kind: DepartureStatusKind;
}

export interface DepartureRow {
  readonly id: string;
  /** ISO timestamp (UTC). */
  readonly scheduled: string;
  /** ISO timestamp (UTC) of the live estimate or actual time, if Digitraffic has one. */
  readonly expected: string | null;
  readonly delayMinutes: number | null;
  readonly destination: string;
  readonly track: string;
  readonly train: string;
  readonly status: string;
  readonly statusKind: DepartureStatusKind;
}
