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
 *   train passengers can board, sorted by scheduled time, then completes. It names
 *   destinations itself from the same station list, loading the list if needed; if
 *   the list can't be loaded, destinations fall back to station codes instead of
 *   failing.
 * - Both error (an Observable error, nothing emitted) when Digitraffic can't be
 *   reached. There are no partial results.
 * - Unsubscribing from `departures(code)` cancels its request. The station list keeps
 *   loading, because other callers share it.
 *
 * Digitraffic is the production adapter; tests use InMemoryDepartureSource.
 */
@Injectable({ providedIn: 'root', useClass: DigitrafficSource })
export abstract class DepartureSource {
  abstract stations(): Observable<readonly Station[]>;
  abstract departures(stationCode: string): Observable<readonly DepartureRow[]>;
}
