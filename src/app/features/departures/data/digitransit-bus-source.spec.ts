import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BUS_STATIONS_FIXTURE,
  busDeparturesFixture,
} from '../../../../testing/digitransit-fixtures';
import { DepartureSource } from './departure-source';
import { DigitransitBusSource } from './digitransit-bus-source';
import { BUS_STATIONS_URL, busDeparturesUrl } from './digitransit-wire';
import { toBusDepartureRows, toBusStations } from './digitransit.mapping';

/** Kuopio, Matkakeskus: three Digitransit stations behind one code. */
const KUOPIO = 'MATKA:357077';
const KUOPIO_IDS = ['MATKA:357077', 'MATKA:388199', 'PohjolanMatka:s4921'];

describe('DigitransitBusSource', () => {
  let source: DepartureSource;
  let http: HttpTestingController;

  const failWith503 = (url: string) =>
    http
      .expectOne(url)
      .flush('Service unavailable', { status: 503, statusText: 'Service Unavailable' });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DepartureSource, useClass: DigitransitBusSource },
      ],
    });
    source = TestBed.inject(DepartureSource);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('asks the proxy for one station’s departures, with the id as it is', () => {
    expect(busDeparturesUrl('PohjolanMatka:s4921')).toBe(
      '/api/buses/departures?id=PohjolanMatka:s4921',
    );
  });

  describe('stations()', () => {
    it('loads the bus stations from the proxy', () => {
      const next = vi.fn();
      source.stations().subscribe(next);

      http.expectOne(BUS_STATIONS_URL).flush(BUS_STATIONS_FIXTURE);

      expect(next).toHaveBeenCalledWith(toBusStations(BUS_STATIONS_FIXTURE).stations);
    });

    it('fetches the list once and serves later calls from memory', () => {
      source.stations().subscribe();
      http.expectOne(BUS_STATIONS_URL).flush(BUS_STATIONS_FIXTURE);
      const next = vi.fn();

      source.stations().subscribe(next);

      http.expectNone(BUS_STATIONS_URL);
      expect(next).toHaveBeenCalledOnce();
    });

    it('does not cache a failure, so the next call tries again', () => {
      const error = vi.fn();
      source.stations().subscribe({ error });
      failWith503(BUS_STATIONS_URL);
      expect(error).toHaveBeenCalledOnce();

      const next = vi.fn();
      source.stations().subscribe(next);
      http.expectOne(BUS_STATIONS_URL).flush(BUS_STATIONS_FIXTURE);

      expect(next).toHaveBeenCalledOnce();
    });

    it('errors on a GraphQL error, which comes with HTTP 200', () => {
      const error = vi.fn();
      source.stations().subscribe({ error });

      http.expectOne(BUS_STATIONS_URL).flush({ data: null, errors: [{ message: 'Bad query' }] });

      expect(error).toHaveBeenCalledOnce();
    });
  });

  describe('departures()', () => {
    beforeEach(() => {
      source.stations().subscribe();
      http.expectOne(BUS_STATIONS_URL).flush(BUS_STATIONS_FIXTURE);
    });

    it('merges the departures of every Digitransit station behind the code', () => {
      const next = vi.fn();
      source.departures(KUOPIO).subscribe(next);

      for (const id of KUOPIO_IDS) {
        http.expectOne(busDeparturesUrl(id)).flush(busDeparturesFixture(id));
      }

      expect(next).toHaveBeenCalledWith(
        toBusDepartureRows(
          KUOPIO_IDS.map((id) => busDeparturesFixture(id)),
          toBusStations(BUS_STATIONS_FIXTURE),
        ),
      );
      expect(next.mock.calls[0][0]).toHaveLength(9);
    });

    it('errors, with no partial result, when one of the requests fails', () => {
      const next = vi.fn();
      const error = vi.fn();
      source.departures(KUOPIO).subscribe({ next, error });

      http.expectOne(busDeparturesUrl(KUOPIO_IDS[0])).flush(busDeparturesFixture(KUOPIO_IDS[0]));
      failWith503(busDeparturesUrl(KUOPIO_IDS[1]));

      expect(next).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledOnce();
      // forkJoin cancels the request still open.
      expect(http.expectOne(busDeparturesUrl(KUOPIO_IDS[2])).cancelled).toBe(true);
    });

    it('errors for a code that is not a bus station', () => {
      const error = vi.fn();

      source.departures('TPE').subscribe({ error });

      expect(error).toHaveBeenCalledOnce();
    });
  });

  it('loads the station list first when departures are asked for before it', () => {
    const next = vi.fn();
    source.departures('MATKA:358750').subscribe(next);

    http.expectOne(BUS_STATIONS_URL).flush(BUS_STATIONS_FIXTURE);
    http.expectOne(busDeparturesUrl('MATKA:358750')).flush(busDeparturesFixture('MATKA:358750'));

    expect(next).toHaveBeenCalledOnce();
  });
});
