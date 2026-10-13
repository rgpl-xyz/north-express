import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STATIONS_FIXTURE,
  TAMPERE_DEPARTURES_FIXTURE,
} from '../../../../testing/digitraffic-fixtures';
import { DepartureSource } from './departure-source';
import { DigitrafficSource } from './digitraffic-source';
import { STATIONS_URL, departuresUrl } from './digitraffic-wire';
import { toDepartureRows, toStations } from './digitraffic.mapping';

const STATION_NAMES: ReadonlyMap<string, string> = new Map(
  toStations(STATIONS_FIXTURE).map((station) => [station.code, station.name]),
);

describe('DigitrafficSource', () => {
  let source: DepartureSource;
  let http: HttpTestingController;

  const failWith503 = (url: string) =>
    http
      .expectOne(url)
      .flush('Service unavailable', { status: 503, statusText: 'Service Unavailable' });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    source = TestBed.inject(DepartureSource);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('is the adapter behind DepartureSource, one instance for the app', () => {
    expect(source).toBeInstanceOf(DigitrafficSource);
    expect(TestBed.inject(DepartureSource)).toBe(source);
  });

  it('cannot be injected on its own, so there is only one station cache', () => {
    expect(() => TestBed.inject(DigitrafficSource)).toThrow();
  });

  it('builds the departures URL for the next 20 departing trains', () => {
    expect(departuresUrl('TPE')).toBe(
      'https://rata.digitraffic.fi/api/v1/live-trains/station/TPE?arrived_trains=0&arriving_trains=0&departed_trains=0&departing_trains=20&include_nonstopping=false',
    );
    expect(departuresUrl('ÄHT')).toContain('/live-trains/station/%C3%84HT?');
  });

  describe('stations()', () => {
    it('loads passenger stations from the metadata endpoint', () => {
      const next = vi.fn();
      source.stations().subscribe(next);

      const request = http.expectOne(STATIONS_URL);
      expect(STATIONS_URL).toBe('https://rata.digitraffic.fi/api/v1/metadata/stations');
      expect(request.request.method).toBe('GET');
      request.flush(STATIONS_FIXTURE);

      expect(next).toHaveBeenCalledWith(toStations(STATIONS_FIXTURE));
    });

    it('fetches the list once and serves later calls from memory', () => {
      source.stations().subscribe();
      http.expectOne(STATIONS_URL).flush(STATIONS_FIXTURE);

      const next = vi.fn();
      source.stations().subscribe(next);

      http.expectNone(STATIONS_URL);
      expect(next).toHaveBeenCalledWith(toStations(STATIONS_FIXTURE));
    });

    it('does not cache a failure, so the next call tries again', () => {
      const error = vi.fn();
      source.stations().subscribe({ error });
      failWith503(STATIONS_URL);
      expect(error).toHaveBeenCalledWith(expect.any(HttpErrorResponse));

      const next = vi.fn();
      source.stations().subscribe(next);
      http.expectOne(STATIONS_URL).flush(STATIONS_FIXTURE);

      expect(next).toHaveBeenCalledWith(toStations(STATIONS_FIXTURE));
    });
  });

  describe('departures()', () => {
    it('resolves destination names from the station list', () => {
      const next = vi.fn();
      source.departures('TPE').subscribe(next);

      http.expectOne(STATIONS_URL).flush(STATIONS_FIXTURE);
      http.expectOne(departuresUrl('TPE')).flush(TAMPERE_DEPARTURES_FIXTURE);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(
        toDepartureRows(TAMPERE_DEPARTURES_FIXTURE, 'TPE', STATION_NAMES),
      );
      expect(next.mock.calls[0][0].map((row: { destination: string }) => row.destination)).toEqual([
        'Nokia',
        'Helsinki',
        'Oulu',
        'Pori',
      ]);
    });

    it('makes one stations request across several departures() calls', () => {
      source.departures('TPE').subscribe();
      http.expectOne(STATIONS_URL).flush(STATIONS_FIXTURE);
      http.expectOne(departuresUrl('TPE')).flush(TAMPERE_DEPARTURES_FIXTURE);

      source.departures('TPE').subscribe();
      source.departures('HKI').subscribe();
      http.expectOne(departuresUrl('TPE')).flush([]);
      http.expectOne(departuresUrl('HKI')).flush([]);

      http.expectNone(STATIONS_URL);
    });

    it('shares one stations request between calls made while it is still loading', () => {
      source.stations().subscribe();
      source.departures('TPE').subscribe();

      http.expectOne(STATIONS_URL).flush(STATIONS_FIXTURE);
      http.expectOne(departuresUrl('TPE')).flush([]);
    });

    it('falls back to station codes when the station list cannot be loaded', () => {
      const next = vi.fn();
      source.departures('TPE').subscribe(next);

      failWith503(STATIONS_URL);
      http.expectOne(departuresUrl('TPE')).flush(TAMPERE_DEPARTURES_FIXTURE);

      expect(next).toHaveBeenCalledWith(
        toDepartureRows(TAMPERE_DEPARTURES_FIXTURE, 'TPE', new Map()),
      );
      expect(next.mock.calls[0][0].map((row: { destination: string }) => row.destination)).toEqual([
        'NOA',
        'HKI',
        'OL',
        'PRI',
      ]);
    });

    it('errors, with no partial result, when the departures request fails', () => {
      const observer = { next: vi.fn(), error: vi.fn() };
      source.departures('TPE').subscribe(observer);

      http.expectOne(STATIONS_URL).flush(STATIONS_FIXTURE);
      failWith503(departuresUrl('TPE'));

      expect(observer.next).not.toHaveBeenCalled();
      expect(observer.error).toHaveBeenCalledWith(expect.any(HttpErrorResponse));
    });
  });
});
