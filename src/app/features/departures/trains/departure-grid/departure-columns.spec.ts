import type {
  CellClassFunc,
  CellClassParams,
  ColDef,
  ValueFormatterFunc,
  ValueFormatterParams,
} from 'ag-grid-community';
import { describe, expect, it } from 'vitest';
import type { DepartureRow, DepartureStatus } from '../../data/departures.models';
import { DEFAULT_COLUMN, DEPARTURE_COLUMNS, compareTracks } from './departure-columns';

function column(field: keyof DepartureRow): ColDef<DepartureRow> {
  const found = DEPARTURE_COLUMNS.find((candidate) => candidate.field === field);
  if (!found) {
    throw new Error(`No column shows ${field}`);
  }
  return found;
}

function format(field: keyof DepartureRow, value: string | DepartureStatus | null): string {
  const formatter = column(field).valueFormatter as ValueFormatterFunc<DepartureRow>;
  return formatter({ value } as ValueFormatterParams<DepartureRow>);
}

const ON_TIME: DepartureStatus = { kind: 'on-time' };
const CANCELLED: DepartureStatus = { kind: 'cancelled' };
const late = (minutes: number): DepartureStatus => ({ kind: 'late', minutes });

describe('DEPARTURE_COLUMNS', () => {
  it('has the departure board columns in order', () => {
    expect(DEPARTURE_COLUMNS.map((candidate) => candidate.headerName)).toEqual([
      'Departs',
      'Expected',
      'Destination',
      'Track',
      'Train',
      'Status',
    ]);
  });

  it('leaves the order to the departure board, so no column sorts by default', () => {
    const sorting = [...DEPARTURE_COLUMNS, DEFAULT_COLUMN].filter(
      (candidate) => candidate.sort || candidate.initialSort,
    );

    expect(sorting).toEqual([]);
  });

  it('shows departure and expected times in Finland time', () => {
    expect(format('scheduled', '2026-10-13T11:02:00.000Z')).toBe('14:02');
    expect(format('expected', '2026-10-13T11:03:48.000Z')).toBe('14:03');
  });

  it('leaves the expected time blank when Digitraffic has none', () => {
    expect(format('expected', null)).toBe('');
  });
});

describe('the Status column', () => {
  const compare = column('status').comparator as (
    a: DepartureStatus | null,
    b: DepartureStatus | null,
  ) => number;
  const cellClass = column('status').cellClass as CellClassFunc<DepartureRow>;
  const classesFor = (value: DepartureStatus | null) =>
    cellClass({ value } as CellClassParams<DepartureRow>);

  it('says whether a departure is on time, how late it is, or that it is cancelled', () => {
    expect(format('status', ON_TIME)).toBe('On time');
    expect(format('status', late(2))).toBe('2 min late');
    expect(format('status', CANCELLED)).toBe('Cancelled');
  });

  it('sorts on time first, then by minutes late, then cancelled', () => {
    const sorted = [CANCELLED, late(10), ON_TIME, late(2)].sort(compare);

    expect(sorted).toEqual([ON_TIME, late(2), late(10), CANCELLED]);
  });

  it('keeps departures with the same status in scheduled order', () => {
    expect(compare(ON_TIME, ON_TIME)).toBe(0);
    expect(compare(late(3), late(3))).toBe(0);
    expect(compare(CANCELLED, CANCELLED)).toBe(0);
  });

  it('shows late departures in bold amber and cancelled ones in bold red', () => {
    expect(classesFor(ON_TIME)).toEqual([]);
    expect(classesFor(late(2))).toEqual(['fw-bold', 'text-warning-emphasis']);
    expect(classesFor(CANCELLED)).toEqual(['fw-bold', 'text-danger-emphasis']);
  });

  it('shows nothing for a missing status and sorts it first', () => {
    expect(format('status', null)).toBe('');
    expect(classesFor(null)).toEqual([]);
    expect([late(2), null].sort(compare)).toEqual([null, late(2)]);
  });
});

describe('compareTracks', () => {
  it('sorts track numbers numerically', () => {
    expect(['10', '2', '1', '3b'].sort(compareTracks)).toEqual(['1', '2', '3b', '10']);
  });
});
