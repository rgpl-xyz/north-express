import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';
import type {
  DepartureRow,
  DigitrafficStation,
  DigitrafficTrain,
  Station,
} from './departures.models';
import { toDepartureRows, toStations } from './digitraffic.mapping';

const API_URL = 'https://rata.digitraffic.fi/api/v1';

export const STATIONS_URL = `${API_URL}/metadata/stations`;

const NEXT_DEPARTURES_QUERY =
  'arrived_trains=0&arriving_trains=0&departed_trains=0&departing_trains=20&include_nonstopping=false';

/** Live trains for a station, limited to the next 20 departures. */
export function departuresUrl(stationCode: string): string {
  return `${API_URL}/live-trains/station/${encodeURIComponent(stationCode)}?${NEXT_DEPARTURES_QUERY}`;
}

/** Reads Fintraffic's open rail data (CC BY 4.0, no API key). Errors are left to the caller. */
@Injectable({ providedIn: 'root' })
export class DigitrafficService {
  private readonly http = inject(HttpClient);

  stations(): Observable<Station[]> {
    return this.http.get<DigitrafficStation[]>(STATIONS_URL).pipe(map(toStations));
  }

  departures(
    stationCode: string,
    stationNames: ReadonlyMap<string, string>,
  ): Observable<DepartureRow[]> {
    return this.http
      .get<DigitrafficTrain[]>(departuresUrl(stationCode))
      .pipe(map((trains) => toDepartureRows(trains, stationCode, stationNames)));
  }
}
