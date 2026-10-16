/*
 * What the app shows. These are the only data types UI code imports; the Digitraffic
 * and Digitransit wire shapes stay inside the data folder.
 */

export interface Station {
  readonly code: string;
  readonly name: string;
  /** Other names people look it up by, such as its Swedish name, shown next to the name. */
  readonly aliases?: readonly string[];
}

/**
 * What a departure's status means. The departure grid decides how it reads and looks.
 * Scheduled means there is no live data, only the timetable, as for most buses.
 */
export type DepartureStatus =
  | { readonly kind: 'on-time' }
  | { readonly kind: 'scheduled' }
  | { readonly kind: 'late'; readonly minutes: number }
  | { readonly kind: 'cancelled' };

export interface DepartureRow {
  readonly id: string;
  /** ISO timestamp (UTC). */
  readonly scheduled: string;
  /** ISO timestamp (UTC) of the actual time or live estimate, if the feed has one. */
  readonly expected: string | null;
  readonly destination: string;
  /** Where to board: a train's track or a bus platform. */
  readonly track: string;
  /** The train, or the bus route (its operator when the route has no number). */
  readonly train: string;
  readonly status: DepartureStatus;
}
