import type { ValueFormatterFunc, ValueFormatterParams } from 'ag-grid-community';
import { describe, expect, it } from 'vitest';
import type { DepartureRow } from '../../data/departures.models';
import { DEPARTURE_COLUMNS, compareTracks } from './departure-columns';

function formatterFor(field: keyof DepartureRow): ValueFormatterFunc<DepartureRow> {
  const column = DEPARTURE_COLUMNS.find((candidate) => candidate.field === field);
  return column?.valueFormatter as ValueFormatterFunc<DepartureRow>;
}

function format(field: keyof DepartureRow, value: string | null): string {
  return formatterFor(field)({ value } as ValueFormatterParams<DepartureRow>);
}

describe('DEPARTURE_COLUMNS', () => {
  it('has the departure board columns in order', () => {
    expect(DEPARTURE_COLUMNS.map((column) => column.headerName)).toEqual([
      'Departs',
      'Expected',
      'Destination',
      'Track',
      'Train',
      'Status',
    ]);
  });

  it('shows departure and expected times in Finland time', () => {
    expect(format('scheduled', '2026-10-13T11:02:00.000Z')).toBe('14:02');
    expect(format('expected', '2026-10-13T11:03:48.000Z')).toBe('14:03');
  });

  it('leaves the expected time blank when Digitraffic has none', () => {
    expect(format('expected', null)).toBe('');
  });
});

describe('compareTracks', () => {
  it('sorts track numbers numerically', () => {
    expect(['10', '2', '1', '3b'].sort(compareTracks)).toEqual(['1', '2', '3b', '10']);
  });
});
