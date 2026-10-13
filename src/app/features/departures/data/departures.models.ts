/*
 * What the app shows. These are the only data types UI code imports; the Digitraffic
 * wire shapes stay inside the data folder (digitraffic-wire.ts).
 */

export interface Station {
  readonly code: string;
  readonly name: string;
}

/** What a departure's status means. The departure grid decides how it reads and looks. */
export type DepartureStatus =
  | { readonly kind: 'on-time' }
  | { readonly kind: 'late'; readonly minutes: number }
  | { readonly kind: 'cancelled' };

export interface DepartureRow {
  readonly id: string;
  /** ISO timestamp (UTC). */
  readonly scheduled: string;
  /** ISO timestamp (UTC) of the actual time or live estimate, if Digitraffic has one. */
  readonly expected: string | null;
  readonly destination: string;
  readonly track: string;
  readonly train: string;
  readonly status: DepartureStatus;
}
