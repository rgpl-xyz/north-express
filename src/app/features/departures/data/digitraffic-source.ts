import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, catchError, forkJoin, map, of, shareReplay } from 'rxjs';
// Type-only, so the two files don't import each other at runtime (DepartureSource
// names this class as its default implementation).
import type { DepartureSource } from './departure-source';
import type { DepartureRow, Station } from './departures.models';
import type { DigitrafficStation, DigitrafficTrain } from './digitraffic-wire';
import { toDepartureRows, toStations } from './digitraffic.mapping';

const API_URL = 'https://rata.digitraffic.fi/api/v1';

export const STATIONS_URL = `${API_URL}/metadata/stations`;

const NEXT_DEPARTURES_QUERY =
  'arrived_trains=0&arriving_trains=0&departed_trains=0&departing_trains=20&include_nonstopping=false';

/** Live trains for a station, limited to the next 20 departures. */
export function departuresUrl(stationCode: string): string {
  return `${API_URL}/live-trains/station/${encodeURIComponent(stationCode)}?${NEXT_DEPARTURES_QUERY}`;
}

/**
 * DepartureSource over Fintraffic's open rail data (CC BY 4.0, no API key).
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
