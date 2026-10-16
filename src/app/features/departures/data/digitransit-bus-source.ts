import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, forkJoin, map, shareReplay, switchMap, throwError } from 'rxjs';
import type { DepartureSource } from './departure-source';
import type { DepartureRow, Station } from './departures.models';
import {
  BUS_STATIONS_URL,
  type DeparturesResponse,
  type StationsResponse,
  busDeparturesUrl,
} from './digitransit-wire';
import { toBusDepartureRows, toBusStations } from './digitransit.mapping';

/**
 * DepartureSource over Digitransit's bus data (CC BY 4.0), through the app's /api/buses
 * proxy, which holds the API key. The buses route provides it in place of the train
 * source, so the bus board has its own instance and station cache.
 */
@Injectable()
export class DigitransitBusSource implements DepartureSource {
  private readonly http = inject(HttpClient);

  /*
   * One request shared by every caller. shareReplay keeps the list after a success
   * and resets after an error, so a failure is never cached.
   */
  private readonly busStations = this.http
    .get<StationsResponse>(BUS_STATIONS_URL)
    .pipe(map(toBusStations), shareReplay(1));

  stations(): Observable<readonly Station[]> {
    return this.busStations.pipe(map(({ stations }) => stations));
  }

  /**
   * Departures from every Digitransit station behind the code, requested in parallel.
   * Needs the station list for that, and to tell where each bus ends, so it fails when
   * the list can't be loaded.
   */
  departures(stationCode: string): Observable<readonly DepartureRow[]> {
    return this.busStations.pipe(
      switchMap((listed) => {
        const stationIds = listed.ids.get(stationCode);
        if (!stationIds) {
          return throwError(() => new Error(`No bus station ${stationCode}`));
        }
        return forkJoin(
          stationIds.map((id) => this.http.get<DeparturesResponse>(busDeparturesUrl(id))),
        ).pipe(map((responses) => toBusDepartureRows(responses, listed)));
      }),
    );
  }
}
