import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, catchError, forkJoin, map, of, shareReplay } from 'rxjs';
// Type-only, so the two files don't import each other at runtime (DepartureSource
// names this class as its default implementation).
import type { DepartureSource } from './departure-source';
import type { DepartureRow, Station } from './departures.models';
import {
  type DigitrafficStation,
  type DigitrafficTrain,
  STATIONS_URL,
  departuresUrl,
} from './digitraffic-wire';
import { toDepartureRows, toStations } from './digitraffic.mapping';

/**
 * DepartureSource over Fintraffic's open rail data (CC BY 4.0, no API key). It names
 * destinations from its station list; if the list can't be loaded, destinations fall
 * back to station codes instead of failing.
 * Not provided on its own: inject DepartureSource, whose `useClass` creates the one
 * instance, so the app has a single station cache.
 */
@Injectable()
export class DigitrafficSource implements DepartureSource {
  private readonly http = inject(HttpClient);

  /*
   * One request shared by every caller. shareReplay keeps the list after a success
   * and resets after an error, so a failure is never cached.
   */
  private readonly stationList = this.http
    .get<DigitrafficStation[]>(STATIONS_URL)
    .pipe(map(toStations), shareReplay(1));

  stations(): Observable<readonly Station[]> {
    return this.stationList;
  }

  departures(stationCode: string): Observable<readonly DepartureRow[]> {
    const stationNames = this.stationList.pipe(
      map((stations) => new Map(stations.map((station) => [station.code, station.name]))),
      catchError(() => of(new Map<string, string>())),
    );
    const trains = this.http.get<DigitrafficTrain[]>(departuresUrl(stationCode));

    // Both requests run in parallel; the station list is usually cached already.
    return forkJoin([trains, stationNames]).pipe(
      map(([liveTrains, names]) => toDepartureRows(liveTrains, stationCode, names)),
    );
  }
}
