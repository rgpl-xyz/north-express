import { describe, expect, it } from 'vitest';
import {
  PASILA_RING_TRAIN_FIXTURE,
  STATIONS_FIXTURE,
  TAMPERE_DEPARTURES_FIXTURE,
} from '../../../../testing/digitraffic-fixtures';
import type { DepartureRow } from './departures.models';
import type { DigitrafficTimeTableRow, DigitrafficTrain } from './digitraffic-wire';
import {
  departureStatus,
  stationDisplayName,
  toDepartureRows,
  toStations,
  trainLabel,
} from './digitraffic.mapping';

const STATION_NAMES: ReadonlyMap<string, string> = new Map(
  toStations(STATIONS_FIXTURE).map((station) => [station.code, station.name]),
);

function row(overrides: Partial<DigitrafficTimeTableRow> = {}): DigitrafficTimeTableRow {
  return {
    stationShortCode: 'TPE',
    type: 'DEPARTURE',
    trainStopping: true,
    commercialStop: true,
    commercialTrack: '4',
    cancelled: false,
    scheduledTime: '2026-10-13T10:00:00.000Z',
    ...overrides,
  };
}

function train(overrides: Partial<DigitrafficTrain> = {}): DigitrafficTrain {
  return {
    trainNumber: 9001,
    departureDate: '2026-10-13',
    trainType: 'IC',
    trainCategory: 'Long-distance',
    commuterLineID: '',
    cancelled: false,
    timeTableRows: [
      row(),
      row({ stationShortCode: 'HKI', type: 'ARRIVAL', scheduledTime: '2026-10-13T11:40:00.000Z' }),
    ],
    ...overrides,
  };
}

function rowFor(trainNumber: number): DepartureRow | undefined {
  return toDepartureRows(TAMPERE_DEPARTURES_FIXTURE, 'TPE', STATION_NAMES).find((departure) =>
    departure.id.endsWith(`-${trainNumber}`),
  );
}

describe('stationDisplayName', () => {
  it('strips a trailing " asema"', () => {
    expect(stationDisplayName('Helsinki asema')).toBe('Helsinki');
  });

  it('leaves names without the suffix alone', () => {
    expect(stationDisplayName('Leppävaara')).toBe('Leppävaara');
    expect(stationDisplayName('Asemakylä')).toBe('Asemakylä');
  });

  it('only strips the suffix at the end of the name', () => {
    expect(stationDisplayName('Pasila asema autojuna')).toBe('Pasila asema autojuna');
  });

  it('replaces underscores with spaces', () => {
    expect(stationDisplayName('Pietari_(Finljandski)')).toBe('Pietari (Finljandski)');
  });
});

describe('toStations', () => {
  it('keeps only stations with passenger traffic', () => {
    const codes = toStations(STATIONS_FIXTURE).map((station) => station.code);

    expect(codes).toContain('HKI');
    expect(codes).toContain('TPE');
    expect(codes).not.toContain('AHO');
    expect(codes).not.toContain('ILR');
    expect(codes).not.toContain('VKA');
  });

  it('uses the display name for each station', () => {
    expect(toStations(STATIONS_FIXTURE)).toContainEqual({ code: 'HKI', name: 'Helsinki' });
  });

  it('sorts by display name in Finnish alphabetical order', () => {
    expect(toStations(STATIONS_FIXTURE).map((station) => station.name)).toEqual([
      'Helsinki',
      'Leppävaara',
      'Nokia',
      'Oulu',
      'Pasila',
      'Pietari (Finljandski)',
      'Pori',
      'Tampere',
      'Toijala',
      'Turku',
      'Vaasa',
      'Ähtäri',
    ]);
  });

  it('does not change the input array', () => {
    const before = STATIONS_FIXTURE.map((station) => station.stationShortCode);

    toStations(STATIONS_FIXTURE);

    expect(STATIONS_FIXTURE.map((station) => station.stationShortCode)).toEqual(before);
  });
});

describe('trainLabel', () => {
  it('labels commuter trains by their line letter', () => {
    expect(trainLabel(train({ trainType: 'HL', trainNumber: 1735, commuterLineID: 'M' }))).toBe(
      'Commuter M',
    );
  });

  it('labels other trains by type and number', () => {
    expect(trainLabel(train({ trainType: 'IC', trainNumber: 25, commuterLineID: '' }))).toBe(
      'IC 25',
    );
    expect(trainLabel(train({ trainType: 'S', trainNumber: 45, commuterLineID: undefined }))).toBe(
      'S 45',
    );
  });
});

describe('departureStatus', () => {
  it('reports a cancelled train', () => {
    expect(departureStatus(train({ cancelled: true }), row())).toEqual({
      label: 'Cancelled',
      kind: 'cancelled',
    });
  });

  it('reports a cancelled stop on a running train', () => {
    expect(departureStatus(train(), row({ cancelled: true, differenceInMinutes: 5 }))).toEqual({
      label: 'Cancelled',
      kind: 'cancelled',
    });
  });

  it('reports a delay in minutes', () => {
    expect(departureStatus(train(), row({ differenceInMinutes: 2 }))).toEqual({
      label: '2 min late',
      kind: 'late',
    });
  });

  it('reports on time when the train is not late', () => {
    expect(departureStatus(train(), row({ differenceInMinutes: 0 })).label).toBe('On time');
    expect(departureStatus(train(), row({ differenceInMinutes: -1 })).label).toBe('On time');
    expect(departureStatus(train(), row()).label).toBe('On time');
  });
});

describe('toDepartureRows', () => {
  it('maps the captured Tampere departures, sorted by scheduled time', () => {
    expect(toDepartureRows(TAMPERE_DEPARTURES_FIXTURE, 'TPE', STATION_NAMES)).toEqual([
      {
        id: '2026-10-13-1735',
        scheduled: '2026-10-13T09:40:00.000Z',
        expected: '2026-10-13T09:40:00.000Z',
        delayMinutes: 0,
        destination: 'Nokia',
        track: '2',
        train: 'Commuter M',
        status: 'On time',
        statusKind: 'on-time',
      },
      {
        id: '2026-10-13-38',
        scheduled: '2026-10-13T11:00:00.000Z',
        expected: '2026-10-13T11:00:00.000Z',
        delayMinutes: 0,
        destination: 'Helsinki',
        track: '1',
        train: 'IC 38',
        status: 'On time',
        statusKind: 'on-time',
      },
      {
        id: '2026-10-13-25',
        scheduled: '2026-10-13T11:02:00.000Z',
        expected: '2026-10-13T11:03:48.000Z',
        delayMinutes: 2,
        destination: 'Oulu',
        track: '2',
        train: 'IC 25',
        status: '2 min late',
        statusKind: 'late',
      },
      {
        id: '2026-10-13-467',
        scheduled: '2026-10-13T11:11:00.000Z',
        expected: null,
        delayMinutes: null,
        destination: 'Pori',
        track: '3',
        train: 'IC 467',
        status: 'On time',
        statusKind: 'on-time',
      },
    ]);
  });

  it('uses the departure at the chosen station, not the arrival or the origin', () => {
    const departure = rowFor(25);

    expect(departure?.scheduled).toBe('2026-10-13T11:02:00.000Z');
    expect(departure?.track).toBe('2');
  });

  it('skips rows where the train passes the station without stopping', () => {
    const passingThenStopping = train({
      timeTableRows: [
        row({
          trainStopping: false,
          scheduledTime: '2026-10-13T09:00:00.000Z',
          commercialTrack: '',
        }),
        row({ scheduledTime: '2026-10-13T10:30:00.000Z', commercialTrack: '7' }),
        row({ stationShortCode: 'HKI', type: 'ARRIVAL' }),
      ],
    });

    const [departure] = toDepartureRows([passingThenStopping], 'TPE', STATION_NAMES);

    expect(departure.scheduled).toBe('2026-10-13T10:30:00.000Z');
    expect(departure.track).toBe('7');
  });

  it('leaves out trains that never stop at the station', () => {
    const passingOnly = train({ timeTableRows: [row({ trainStopping: false })] });

    expect(toDepartureRows([passingOnly], 'TPE', STATION_NAMES)).toEqual([]);
  });

  it('leaves out cargo and other non-passenger trains', () => {
    const labels = toDepartureRows(TAMPERE_DEPARTURES_FIXTURE, 'TPE', STATION_NAMES).map(
      (departure) => departure.train,
    );

    expect(labels).not.toContain('T 3816');
  });

  it('names the destination after the last timetable row', () => {
    expect(rowFor(38)?.destination).toBe('Helsinki');
    expect(rowFor(1735)?.destination).toBe('Nokia');
  });

  it('falls back to the station code when the destination is not in the stations list', () => {
    const destinations = toDepartureRows(TAMPERE_DEPARTURES_FIXTURE, 'TPE', new Map()).map(
      (departure) => departure.destination,
    );

    expect(destinations).toEqual(['NOA', 'HKI', 'OL', 'PRI']);
  });

  it('uses the actual time when there is no live estimate', () => {
    const departed = train({
      timeTableRows: [
        row({ actualTime: '2026-10-13T10:01:10.000Z', differenceInMinutes: 1 }),
        row({ stationShortCode: 'HKI', type: 'ARRIVAL' }),
      ],
    });

    const [departure] = toDepartureRows([departed], 'TPE', STATION_NAMES);

    expect(departure.expected).toBe('2026-10-13T10:01:10.000Z');
    expect(departure.status).toBe('1 min late');
  });

  it('prefers the actual time over the live estimate', () => {
    const both = train({
      timeTableRows: [
        row({
          liveEstimateTime: '2026-10-13T10:03:00.000Z',
          actualTime: '2026-10-13T10:02:00.000Z',
        }),
      ],
    });

    expect(toDepartureRows([both], 'TPE', STATION_NAMES)[0].expected).toBe(
      '2026-10-13T10:02:00.000Z',
    );
  });

  it('skips technical stops where passengers cannot board', () => {
    const technicalThenCommercial = train({
      timeTableRows: [
        row({ commercialStop: false, scheduledTime: '2026-10-13T09:50:00.000Z' }),
        row({ scheduledTime: '2026-10-13T10:05:00.000Z', commercialTrack: '6' }),
        row({ stationShortCode: 'HKI', type: 'ARRIVAL' }),
      ],
    });

    const [departure] = toDepartureRows([technicalThenCommercial], 'TPE', STATION_NAMES);

    expect(departure.scheduled).toBe('2026-10-13T10:05:00.000Z');
    expect(departure.track).toBe('6');
  });

  it('leaves out trains that only make a technical stop at the station', () => {
    const technicalOnly = train({
      trainType: 'HL',
      trainCategory: 'Commuter',
      commuterLineID: 'V',
      timeTableRows: [row({ commercialStop: false }), row({ stationShortCode: 'HKI' })],
    });
    const noCommercialFlag = train({
      timeTableRows: [row({ commercialStop: undefined }), row({ stationShortCode: 'HKI' })],
    });

    expect(toDepartureRows([technicalOnly, noCommercialFlag], 'TPE', STATION_NAMES)).toEqual([]);
  });

  it('marks a cancelled train as cancelled', () => {
    const cancelled = TAMPERE_DEPARTURES_FIXTURE.map((departure) =>
      departure.trainNumber === 25 ? { ...departure, cancelled: true } : departure,
    );

    const departure = toDepartureRows(cancelled, 'TPE', STATION_NAMES).find(
      (candidate) => candidate.train === 'IC 25',
    );

    expect(departure?.status).toBe('Cancelled');
    expect(departure?.statusKind).toBe('cancelled');
  });

  it('returns an empty list when nothing departs', () => {
    expect(toDepartureRows([], 'TPE', STATION_NAMES)).toEqual([]);
  });
});

describe('toDepartureRows for ring-line trains (P and I)', () => {
  /** The same train before it set off: no row has an actual time yet. */
  function beforeDeparture(ringTrain: DigitrafficTrain): DigitrafficTrain {
    return {
      ...ringTrain,
      timeTableRows: ringTrain.timeTableRows.map((timetableRow) => ({
        ...timetableRow,
        actualTime: undefined,
      })),
    };
  }

  const [RING_TRAIN] = PASILA_RING_TRAIN_FIXTURE;

  it('shows the upcoming return pass at Pasila once the outbound pass has departed', () => {
    expect(toDepartureRows(PASILA_RING_TRAIN_FIXTURE, 'PSL', STATION_NAMES)).toEqual([
      {
        id: '2026-10-13-8665',
        scheduled: '2026-10-13T10:16:30.000Z',
        expected: '2026-10-13T10:16:30.000Z',
        delayMinutes: 0,
        destination: 'Helsinki',
        track: '1',
        train: 'Commuter P',
        status: 'On time',
        statusKind: 'on-time',
      },
    ]);
  });

  it('shows the outbound pass at Pasila, bound for the airport, before it departs', () => {
    const [departure] = toDepartureRows([beforeDeparture(RING_TRAIN)], 'PSL', STATION_NAMES);

    expect(departure.scheduled).toBe('2026-10-13T09:22:30.000Z');
    expect(departure.track).toBe('11');
    expect(departure.destination).toBe('Lentoasema (Airport)');
  });

  it('shows Helsinki departures as bound for the airport', () => {
    const [departure] = toDepartureRows([beforeDeparture(RING_TRAIN)], 'HKI', STATION_NAMES);

    expect(departure.scheduled).toBe('2026-10-13T09:18:00.000Z');
    expect(departure.destination).toBe('Lentoasema (Airport)');
  });

  it('falls back to the last pass when every pass has departed', () => {
    const allDeparted: DigitrafficTrain = {
      ...RING_TRAIN,
      timeTableRows: RING_TRAIN.timeTableRows.map((timetableRow) => ({
        ...timetableRow,
        actualTime: timetableRow.actualTime ?? timetableRow.scheduledTime,
      })),
    };

    const [departure] = toDepartureRows([allDeparted], 'PSL', STATION_NAMES);

    expect(departure.scheduled).toBe('2026-10-13T10:16:30.000Z');
    expect(departure.expected).toBe('2026-10-13T10:16:30.000Z');
  });

  it('keeps the last station as the destination for other lines that call at the airport', () => {
    const otherLine: DigitrafficTrain = { ...beforeDeparture(RING_TRAIN), commuterLineID: 'K' };

    const [departure] = toDepartureRows([otherLine], 'HKI', STATION_NAMES);

    expect(departure.destination).toBe('Helsinki');
  });
});
