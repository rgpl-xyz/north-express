import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STATIONS_FIXTURE,
  TAMPERE_DEPARTURES_FIXTURE,
} from '../../../../testing/digitraffic-fixtures';
import { toDepartureRows, toStations } from './digitraffic.mapping';
import { DigitrafficService, STATIONS_URL, departuresUrl } from './digitraffic.service';

const NAMES: ReadonlyMap<string, string> = new Map([['OL', 'Oulu']]);

describe('DigitrafficService', () => {
  let service: DigitrafficService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DigitrafficService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('builds the departures URL for the next 20 departing trains', () => {
    expect(departuresUrl('TPE')).toBe(
      'https://rata.digitraffic.fi/api/v1/live-trains/station/TPE?arrived_trains=0&arriving_trains=0&departed_trains=0&departing_trains=20&include_nonstopping=false',
    );
  });

  it('encodes station codes that contain Finnish letters', () => {
    expect(departuresUrl('ÄHT')).toContain('/live-trains/station/%C3%84HT?');
  });

  it('loads passenger stations from the metadata endpoint', () => {
    const next = vi.fn();
    service.stations().subscribe(next);

    const request = http.expectOne(STATIONS_URL);
    expect(STATIONS_URL).toBe('https://rata.digitraffic.fi/api/v1/metadata/stations');
    expect(request.request.method).toBe('GET');
    request.flush(STATIONS_FIXTURE);

    expect(next).toHaveBeenCalledWith(toStations(STATIONS_FIXTURE));
  });

  it('loads and maps departures for a station', () => {
    const next = vi.fn();
    service.departures('TPE', NAMES).subscribe(next);

    const request = http.expectOne(departuresUrl('TPE'));
    expect(request.request.method).toBe('GET');
    request.flush(TAMPERE_DEPARTURES_FIXTURE);

    expect(next).toHaveBeenCalledWith(toDepartureRows(TAMPERE_DEPARTURES_FIXTURE, 'TPE', NAMES));
  });

  it('passes HTTP failures on to the caller', () => {
    const error = vi.fn();
    service.departures('TPE', NAMES).subscribe({ error });

    http
      .expectOne(departuresUrl('TPE'))
      .flush('Service unavailable', { status: 503, statusText: 'Service Unavailable' });

    expect(error).toHaveBeenCalledWith(expect.any(HttpErrorResponse));
  });
});
