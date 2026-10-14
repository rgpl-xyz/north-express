import { describe, expect, it } from 'vitest';
import {
  BUS_STATIONS_FIXTURE,
  busDeparturesFixture,
} from '../../../../testing/digitransit-fixtures';
import type {
  DeparturesResponse,
  DigitransitStation,
  DigitransitStoptime,
} from './digitransit-wire';
import { toBusDepartureRows, toBusStations } from './digitransit.mapping';

function station(overrides: Partial<DigitransitStation> = {}): DigitransitStation {
  return {
    gtfsId: 'MATKA:1',
    name: 'Matkakeskus',
    vehicleMode: 'BUS',
    lat: 61,
    lon: 25,
    ...overrides,
  };
}

function stationsResponse(...stations: DigitransitStation[]) {
  return { data: { stations } };
}

function stoptime(overrides: Partial<DigitransitStoptime> = {}): DigitransitStoptime {
  return {
    stop: { gtfsId: 'MATKA:9', platformCode: '3' },
    serviceDay: 1791925200, // 14 October 2026, 00:00 in Finland
    scheduledDeparture: 64800, // 18:00
    realtimeDeparture: 64800,
    realtime: false,
    realtimeState: 'SCHEDULED',
    headsign: 'Lahti',
    trip: {
      gtfsId: 'MATKA:trip-1',
      arrivalStoptime: {
        scheduledArrival: 70200, // 19:30
        stop: { gtfsId: 'MATKA:20', name: 'Lahti, Matkakeskus' },
      },
      route: { shortName: 'OB37', agency: { name: 'OnniBus' } },
    },
    ...overrides,
  };
}

function departuresResponse(...stoptimes: DigitransitStoptime[]): DeparturesResponse {
  return { data: { station: { stoptimesWithoutPatterns: stoptimes } } };
}

const fixtureRows = (...ids: string[]) => toBusDepartureRows(ids.map(busDeparturesFixture));

describe('toBusStations', () => {
  const { stations, ids } = toBusStations(BUS_STATIONS_FIXTURE);

  it('lists each bus station once, in Finnish alphabetical order', () => {
    expect(stations.map((listed) => listed.name)).toEqual([
      'Kamppi (kaukoliikenneterminaali)',
      'Kamppi (lähiliikenneterminaali)',
      'Kokkola, linja-autoasema',
      'Kuopio, Matkakeskus',
      'Linja-autoasema',
      'Tampere, linja-autoasema',
      'Tapiola (M)',
      'Äänekoski',
      'Äänekoski las',
    ]);
  });

  it('makes one station of the same station in several feeds, named "Town, place"', () => {
    const kokkola = stations.find((listed) => listed.name.startsWith('Kokkola'));

    expect(kokkola?.code).toBe('INGVESSVANBACK:S4381');
    expect(ids.get('INGVESSVANBACK:S4381')).toEqual([
      'IngvesSvanback:s4381',
      'MATKA:346812',
      'MATKA:357076',
      'PohjolanMatka:s4381',
    ]);
  });

  it('codes a station by its first Digitransit id, in capitals', () => {
    expect(stations.find((listed) => listed.name === 'Kuopio, Matkakeskus')?.code).toBe(
      'MATKA:357077',
    );
    expect(ids.get('MATKA:357077')).toEqual([
      'MATKA:357077',
      'MATKA:388199',
      'PohjolanMatka:s4921',
    ]);
  });

  it('keeps same-named stations apart when they are in different towns', () => {
    const result = toBusStations(
      stationsResponse(
        station({ gtfsId: 'Lahti:1', lat: 60.98, lon: 25.66 }),
        station({ gtfsId: 'Pori:1', lat: 61.48, lon: 21.79 }),
      ),
    );

    expect(result.stations).toEqual([
      { code: 'LAHTI:1', name: 'Matkakeskus' },
      { code: 'PORI:1', name: 'Matkakeskus' },
    ]);
  });

  it('merges same-named stations within a kilometre, but not further apart', () => {
    const result = toBusStations(
      stationsResponse(
        station({ gtfsId: 'A:1', lat: 61 }),
        station({ gtfsId: 'A:2', lat: 61.008 }), // about 900 m north
        station({ gtfsId: 'A:3', lat: 61.01 }), // about 1.1 km north
      ),
    );

    expect([...result.ids.values()]).toEqual([['A:1', 'A:2'], ['A:3']]);
  });

  it('leaves out ids the proxy would refuse', () => {
    const result = toBusStations(stationsResponse(station({ gtfsId: 'MATKA:1 2' })));

    expect(result.stations).toEqual([]);
  });

  it('throws on a GraphQL error', () => {
    expect(() => toBusStations({ data: null, errors: [{ message: 'Bad query' }] })).toThrow(
      'Bad query',
    );
  });
});

describe('toBusDepartureRows', () => {
  it('maps a departure: times, platform, route and headsign', () => {
    expect(toBusDepartureRows([departuresResponse(stoptime())])).toEqual([
      {
        id: 'MATKA:trip-1/MATKA:9/1791990000',
        scheduled: '2026-10-14T15:00:00.000Z',
        expected: null,
        destination: 'Lahti',
        track: '3',
        train: 'OB37',
        status: { kind: 'scheduled' },
      },
    ]);
  });

  it('leaves out buses that end at the station', () => {
    const rows = fixtureRows('MATKA:358750');

    expect(rows).toHaveLength(16);
    expect(rows.some((row) => row.destination === 'Tampere')).toBe(false);
  });

  it('sorts by scheduled time, merging several stations, and keeps the first 20', () => {
    const rows = fixtureRows('MATKA:358750', 'HSL:2000002');
    const times = rows.map((row) => Date.parse(row.scheduled));

    expect(rows).toHaveLength(20);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(rows.map((row) => row.train))).toContain('OB3');
    expect(new Set(rows.map((row) => row.train))).toContain('510');
  });

  it('shows the trip’s last stop when the headsign is missing or only the route number', () => {
    expect(new Set(fixtureRows('MATKA:401830').map((row) => row.destination))).toEqual(
      new Set(['Varkaus Matkakeskus', 'Savontie 8', 'Outokumpu kaupungintalo P']),
    );
    expect(fixtureRows('MATKA:466985').every((row) => row.destination !== row.train)).toBe(true);
  });

  it('shows a bus once when its feed lists it under two trips', () => {
    expect(fixtureRows('MATKA:401830')).toHaveLength(5);
  });

  it('names the operator for a route without a number', () => {
    expect(new Set(fixtureRows('PohjolanMatka:s4921').map((row) => row.train))).toEqual(
      new Set(['Pohjolan Matka']),
    );
  });

  it('keeps a loop that starts and ends at the station, and leaves out its return', () => {
    const loop = stoptime().trip;
    const here = { gtfsId: 'MATKA:20', platformCode: '3' };
    const rows = toBusDepartureRows([
      departuresResponse(
        stoptime({ stop: here, trip: loop }),
        stoptime({ stop: here, trip: loop, scheduledDeparture: 70200, realtimeDeparture: 70200 }),
      ),
    ]);

    expect(rows.map((row) => row.scheduled)).toEqual(['2026-10-14T15:00:00.000Z']);
  });

  it('keeps nothing later than where a station with all 20 answered may have more', () => {
    // 20 stoptimes from 18:00 to 18:19, 15 of them buses ending here.
    const busy = Array.from({ length: 20 }, (_, minute) => {
      const time = 64800 + minute * 60;
      const here = { scheduledArrival: time, stop: { gtfsId: 'MATKA:9', name: 'Here' } };
      const { trip } = stoptime();
      return stoptime({
        scheduledDeparture: time,
        realtimeDeparture: time,
        trip: minute < 15 ? { ...trip, arrivalStoptime: here } : trip,
      });
    });
    const quiet = stoptime({ scheduledDeparture: 68400, realtimeDeparture: 68400 }); // 19:00

    const rows = toBusDepartureRows([departuresResponse(...busy), departuresResponse(quiet)]);

    expect(rows).toHaveLength(5);
    expect(rows.at(-1)?.scheduled).toBe('2026-10-14T15:19:00.000Z');
  });

  it('keeps the copy with live data when a bus is listed twice, whichever comes first', () => {
    const timetable = departuresResponse(stoptime());
    const live = departuresResponse(
      stoptime({
        realtime: true,
        realtimeState: 'UPDATED',
        trip: { ...stoptime().trip, gtfsId: 'HSL:2' },
      }),
    );

    for (const responses of [
      [timetable, live],
      [live, timetable],
    ]) {
      expect(toBusDepartureRows(responses).map((row) => row.status)).toEqual([{ kind: 'on-time' }]);
    }
  });

  it('has no departures from a station where buses only arrive', () => {
    expect(fixtureRows('MATKA:388199')).toEqual([]);
  });

  describe('status', () => {
    const statusOf = (overrides: Partial<DigitransitStoptime>) =>
      toBusDepartureRows([departuresResponse(stoptime(overrides))])[0];

    it('is scheduled without live data, with no expected time', () => {
      expect(statusOf({})).toMatchObject({ status: { kind: 'scheduled' }, expected: null });
    });

    it('is late by whole minutes, with the live time as expected', () => {
      expect(
        statusOf({ realtime: true, realtimeState: 'UPDATED', realtimeDeparture: 64800 + 296 }),
      ).toMatchObject({
        status: { kind: 'late', minutes: 4 },
        expected: '2026-10-14T15:04:56.000Z',
      });
    });

    it('is on time when less than a minute late, or early', () => {
      for (const realtimeDeparture of [64800 + 59, 64800 - 63]) {
        expect(
          statusOf({ realtime: true, realtimeState: 'UPDATED', realtimeDeparture }).status,
        ).toEqual({ kind: 'on-time' });
      }
    });

    it('is cancelled when the feed says so', () => {
      expect(statusOf({ realtime: true, realtimeState: 'CANCELED' }).status).toEqual({
        kind: 'cancelled',
      });
    });

    it('reads Tapiola’s live HSL data', () => {
      const statuses = fixtureRows('HSL:2000002').map((row) => row.status.kind);

      expect(statuses.filter((kind) => kind === 'late')).toHaveLength(3);
      expect(statuses).toContain('on-time');
      expect(statuses).toContain('scheduled');
    });
  });

  it('throws for a station Digitransit does not know', () => {
    expect(() => toBusDepartureRows([{ data: { station: null } }])).toThrow('no such station');
  });
});
