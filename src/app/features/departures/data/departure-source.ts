import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { DepartureRow, Station } from './departures.models';
import { DigitrafficSource } from './digitraffic-source';

/**
 * Where the departure board gets its stations and departures. Everything a caller
 * needs to know:
 *
 * - `stations()` emits the passenger stations, named for display and sorted in
 *   Finnish alphabetical order, then completes. The list is fetched once and cached
 *   after the first success. A failure is not cached, so a later call tries again.
 * - `departures(code)` emits the next departures from that station, one row per
 *   departure passengers can board, sorted by scheduled time, then completes. It may
 *   load the station list itself, if it needs it.
 * - Both error (an Observable error, nothing emitted) when the data can't be
 *   loaded. There are no partial results.
 * - Unsubscribing from `departures(code)` cancels its request. The station list keeps
 *   loading, because other callers share it.
 *
 * Trains come from DigitrafficSource, the default. The buses route provides
 * DigitransitBusSource instead. Tests use InMemoryDepartureSource.
 */
@Injectable({ providedIn: 'root', useClass: DigitrafficSource })
export abstract class DepartureSource {
  abstract stations(): Observable<readonly Station[]>;
  abstract departures(stationCode: string): Observable<readonly DepartureRow[]>;
}
