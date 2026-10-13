/*
 * What the app shows. These are the only data types UI code imports; the Digitraffic
 * wire shapes stay inside the data folder (digitraffic-wire.ts).
 */

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
  /** ISO timestamp (UTC) of the actual time or live estimate, if Digitraffic has one. */
  readonly expected: string | null;
  readonly delayMinutes: number | null;
  readonly destination: string;
  readonly track: string;
  readonly train: string;
  readonly status: string;
  readonly statusKind: DepartureStatusKind;
}
