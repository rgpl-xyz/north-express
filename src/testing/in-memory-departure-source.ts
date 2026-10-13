import { Observable, ReplaySubject } from 'rxjs';
import type { DepartureSource } from '../app/features/departures/data/departure-source';
import type { DepartureRow, Station } from '../app/features/departures/data/departures.models';

/** One call to the source, left pending until the test resolves or fails it. */
export class PendingCall<T> {
  private readonly answer = new ReplaySubject<T>(1);
  private settled = false;
  private unsubscribedEarly = false;

  readonly observable = new Observable<T>((subscriber) => {
    const subscription = this.answer.subscribe(subscriber);
    return () => {
      subscription.unsubscribe();
      this.unsubscribedEarly ||= !this.settled;
    };
  });

  /** True when the caller gave up on this call before it was answered. */
  get cancelled(): boolean {
    return this.unsubscribedEarly;
  }

  resolve(value: T): void {
    this.settled = true;
    this.answer.next(value);
    this.answer.complete();
  }

  fail(error: unknown = new Error('Digitraffic could not be reached')): void {
    this.settled = true;
    this.answer.error(error);
  }
}

export interface DeparturesCall {
  readonly stationCode: string;
  readonly call: PendingCall<readonly DepartureRow[]>;
}

/**
 * Test adapter for DepartureSource. Every call returns a fresh pending answer, so a
 * test can look at the Loading state, cancel by moving on, or resolve and fail calls
 * in any order. Built from view types only: no HTTP, no Digitraffic shapes.
 * It does not model the production station cache: every stations() call is a new call.
 */
export class InMemoryDepartureSource implements DepartureSource {
  readonly stationsCalls: PendingCall<readonly Station[]>[] = [];
  readonly departuresCalls: DeparturesCall[] = [];

  stations(): Observable<readonly Station[]> {
    const call = new PendingCall<readonly Station[]>();
    this.stationsCalls.push(call);
    return call.observable;
  }

  departures(stationCode: string): Observable<readonly DepartureRow[]> {
    const call = new PendingCall<readonly DepartureRow[]>();
    this.departuresCalls.push({ stationCode, call });
    return call.observable;
  }

  /** The most recent stations() call. */
  latestStations(): PendingCall<readonly Station[]> {
    const call = this.stationsCalls.at(-1);
    if (!call) {
      throw new Error('stations() has not been called');
    }
    return call;
  }

  /** The most recent departures() call, optionally for one station. */
  latestDepartures(stationCode?: string): PendingCall<readonly DepartureRow[]> {
    const match = this.departuresCalls
      .filter((entry) => stationCode === undefined || entry.stationCode === stationCode)
      .at(-1);
    if (!match) {
      throw new Error(`departures(${stationCode ?? ''}) has not been called`);
    }
    return match.call;
  }
}

export const TEST_STATIONS: readonly Station[] = [
  { code: 'HKI', name: 'Helsinki' },
  { code: 'PSL', name: 'Pasila' },
  { code: 'TPE', name: 'Tampere' },
];

/** A departure row with sensible defaults, for tests that only care about a field or two. */
export function departureRow(overrides: Partial<DepartureRow> = {}): DepartureRow {
  return {
    id: '2026-10-13-25',
    scheduled: '2026-10-13T11:02:00.000Z',
    expected: '2026-10-13T11:03:48.000Z',
    delayMinutes: 2,
    destination: 'Oulu',
    track: '2',
    train: 'IC 25',
    status: '2 min late',
    statusKind: 'late',
    ...overrides,
  };
}
