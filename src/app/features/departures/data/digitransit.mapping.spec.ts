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
import { type BusStations, toBusDepartureRows, toBusStations } from './digitransit.mapping';

type LastStop = NonNullable<DigitransitStoptime['trip']['arrivalStoptime']>['stop'];

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
        stop: {
          gtfsId: 'MATKA:20',
          name: 'Lahti, Matkakeskus',
          lat: 60.98,
          lon: 25.65,
          parentStation: null,
        },
      },
      route: { shortName: 'OB37', agency: { name: 'OnniBus' } },
    },
    ...overrides,
  };
}

function departuresResponse(...stoptimes: DigitransitStoptime[]): DeparturesResponse {
  return { data: { station: { stoptimesWithoutPatterns: stoptimes } } };
}

const FIXTURE_STATIONS = toBusStations(BUS_STATIONS_FIXTURE);
const NO_STATIONS = toBusStations(stationsResponse());

const fixtureRows = (...ids: string[]) =>
  toBusDepartureRows(ids.map(busDeparturesFixture), FIXTURE_STATIONS);

describe('toBusStations', () => {
  const { stations, ids } = toBusStations(BUS_STATIONS_FIXTURE);

  it('lists each bus station once, in Finnish alphabetical order', () => {
    expect(stations.map((listed) => listed.name)).toEqual([
      'Helsinki-Vantaan lentoasema, Matkakeskus',
      'Kamppi (kaukoliikenneterminaali)',
      'Kamppi (lähiliikenneterminaali)',
      'Kantasataman paikallisliikenneterminaali (Kotka)',
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

  it('names a station in Swedish too, where its feed has a Swedish name of its own', () => {
    expect(stations.find((listed) => listed.name === 'Tapiola (M)')?.aliases).toEqual([
      'Hagalund (M)',
    ]);
    expect(
      stations.find((listed) => listed.name === 'Tampere, linja-autoasema'),
    ).not.toHaveProperty('aliases');
  });

  it('gives each Swedish name once, and none that is the name it is listed under', () => {
    const result = toBusStations(
      stationsResponse(
        station({ gtfsId: 'A:1', name: 'Kamppi', sv: 'Kampen' }),
        station({ gtfsId: 'A:2', name: 'Kamppi', sv: 'Kampen' }),
        station({ gtfsId: 'B:1', name: 'Pasila', sv: 'Pasila' }),
      ),
    );

    expect(result.stations).toEqual([
      { code: 'A:1', name: 'Kamppi', aliases: ['Kampen'], position: { lat: 61, lon: 25 } },
      { code: 'B:1', name: 'Pasila', position: { lat: 61, lon: 25 } },
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
      { code: 'LAHTI:1', name: 'Matkakeskus', position: { lat: 60.98, lon: 25.66 } },
      { code: 'PORI:1', name: 'Matkakeskus', position: { lat: 61.48, lon: 21.79 } },
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
    expect(toBusDepartureRows([departuresResponse(stoptime())], NO_STATIONS)).toEqual([
      {
        id: 'MATKA:trip-1/MATKA:9/1791990000',
        scheduled: '2026-10-14T15:00:00.000Z',
        expected: null,
        destination: 'Lahti',
        destinationCode: null,
        track: '3',
        train: 'OB37',
        operator: 'OnniBus',
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
    const unnumbered = (id: string) =>
      new Set(
        fixtureRows(id)
          .filter((row) => row.operator === null)
          .map((row) => row.train),
      );

    expect(unnumbered('PohjolanMatka:s4921')).toEqual(new Set(['Pohjolan Matka']));
    expect(unnumbered('MATKA:358750')).toEqual(new Set(['Valkeakosken Liikenne']));
  });

  it('names who runs a numbered route, as the buses say it', () => {
    const runs = (id: string, route: string) =>
      fixtureRows(id).find((row) => row.train === route)?.operator;

    expect(runs('MATKA:358750', 'OB3')).toBe('OnniBus');
    expect(runs('MATKA:358750', 'V130')).toBe('Valkeakosken Liikenne');
    expect(runs('HSL:2000002', '510')).toBe('HSL');
    expect(runs('MATKA:466985', '3004')).toBe('FlixBus');
  });

  it('keeps a loop that starts and ends at the station, and leaves out its return', () => {
    const loop = stoptime().trip;
    const here = { gtfsId: 'MATKA:20', platformCode: '3' };
    const rows = toBusDepartureRows(
      [
        departuresResponse(
          stoptime({ stop: here, trip: loop }),
          stoptime({ stop: here, trip: loop, scheduledDeparture: 70200, realtimeDeparture: 70200 }),
        ),
      ],
      NO_STATIONS,
    );

    expect(rows.map((row) => row.scheduled)).toEqual(['2026-10-14T15:00:00.000Z']);
  });

  it('keeps nothing later than where a station with all 20 answered may have more', () => {
    // 20 stoptimes from 18:00 to 18:19, 15 of them buses ending here.
    const busy = Array.from({ length: 20 }, (_, minute) => {
      const time = 64800 + minute * 60;
      const here = {
        scheduledArrival: time,
        stop: { gtfsId: 'MATKA:9', name: 'Here', lat: 61, lon: 25, parentStation: null },
      };
      const { trip } = stoptime();
      return stoptime({
        scheduledDeparture: time,
        realtimeDeparture: time,
        trip: minute < 15 ? { ...trip, arrivalStoptime: here } : trip,
      });
    });
    const quiet = stoptime({ scheduledDeparture: 68400, realtimeDeparture: 68400 }); // 19:00

    const rows = toBusDepartureRows(
      [departuresResponse(...busy), departuresResponse(quiet)],
      NO_STATIONS,
    );

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
      expect(toBusDepartureRows(responses, NO_STATIONS).map((row) => row.status)).toEqual([
        { kind: 'on-time' },
      ]);
    }
  });

  it('has no departures from a station where buses only arrive', () => {
    expect(fixtureRows('MATKA:388199')).toEqual([]);
  });

  describe('status', () => {
    const statusOf = (overrides: Partial<DigitransitStoptime>) =>
      toBusDepartureRows([departuresResponse(stoptime(overrides))], NO_STATIONS)[0];

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
    expect(() => toBusDepartureRows([{ data: { station: null } }], NO_STATIONS)).toThrow(
      'no such station',
    );
  });
});

describe('the station a bus ends at', () => {
  const lahti = station({ gtfsId: 'MATKA:20', name: 'Lahti, Matkakeskus', lat: 60.98, lon: 25.65 });
  const LAHTI = toBusStations(stationsResponse(lahti));

  /** A last stop in Lahti, part of no station, unless the overrides say otherwise. */
  function lastStop(overrides: Partial<LastStop> = {}): LastStop {
    return {
      gtfsId: 'MATKA:21',
      name: 'Tulo',
      lat: 60.98,
      lon: 25.65,
      parentStation: null,
      ...overrides,
    };
  }

  function endsAt(stop: LastStop, listed: BusStations = LAHTI): string | null {
    const { trip } = stoptime();
    const ending = stoptime({
      trip: { ...trip, arrivalStoptime: { scheduledArrival: 70200, stop } },
    });
    return toBusDepartureRows([departuresResponse(ending)], listed)[0].destinationCode;
  }

  it('is the listed station its last stop is part of', () => {
    // In Tampere, but part of Lahti's station, as the feed says.
    expect(endsAt(lastStop({ parentStation: { gtfsId: 'MATKA:20' }, lat: 61.5, lon: 23.8 }))).toBe(
      'MATKA:20',
    );
  });

  it('is the code the station is listed under when several feeds list it', () => {
    expect(endsAt(lastStop({ parentStation: { gtfsId: 'MATKA:346812' } }), FIXTURE_STATIONS)).toBe(
      'INGVESSVANBACK:S4381',
    );
  });

  it('is the listed station a short walk from the stop, for a feed that leaves it out', () => {
    // About 100 m north of the station.
    expect(endsAt(lastStop({ lat: 60.9809 }))).toBe('MATKA:20');
  });

  it('is nothing when the stop is further from every listed station', () => {
    // About 500 m north, and a station that isn't listed.
    expect(endsAt(lastStop({ lat: 60.9845 }))).toBeNull();
    expect(endsAt(lastStop({ parentStation: { gtfsId: 'HSL:9' }, lat: 61.5 }))).toBeNull();
  });

  it('is nothing for a trip with no last stop', () => {
    const { trip } = stoptime();
    const rows = toBusDepartureRows(
      [departuresResponse(stoptime({ trip: { ...trip, arrivalStoptime: null } }))],
      LAHTI,
    );

    expect(rows[0].destinationCode).toBeNull();
  });

  it('takes the Tampere buses to Helsinki to Kamppi’s long-distance terminal', () => {
    const toHelsinki = fixtureRows('MATKA:358750').filter((row) => row.destination === 'Helsinki');
    const ends = toHelsinki.map(
      (row) =>
        FIXTURE_STATIONS.stations.find((listed) => listed.code === row.destinationCode)?.name,
    );

    expect(ends.length).toBeGreaterThan(0);
    expect(new Set(ends)).toEqual(new Set(['Kamppi (kaukoliikenneterminaali)']));
  });
});
