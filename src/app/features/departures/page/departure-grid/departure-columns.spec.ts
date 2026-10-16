import type {
  ColDef,
  ICellRendererParams,
  ValueFormatterFunc,
  ValueFormatterParams,
} from 'ag-grid-community';
import { describe, expect, it } from 'vitest';
import type { DepartureRow, DepartureStatus } from '../../data/departures.models';
import { BUS_BOARD, TRAIN_BOARD } from '../board-kind';
import { DEFAULT_COLUMN, compactColumns, departureColumns } from './departure-columns';

const DEPARTURE_COLUMNS = departureColumns(TRAIN_BOARD);

function column(field: keyof DepartureRow): ColDef<DepartureRow> {
  const found = DEPARTURE_COLUMNS.find((candidate) => candidate.field === field);
  if (!found) {
    throw new Error(`No column shows ${field}`);
  }
  return found;
}

/** What a column's cell renderer draws for this value. */
function render(
  field: keyof DepartureRow,
  value: string | DepartureStatus | null,
): HTMLElement | string {
  const renderer = column(field).cellRenderer as (
    params: ICellRendererParams<DepartureRow>,
  ) => HTMLElement | string;
  return renderer({ value } as ICellRendererParams<DepartureRow>);
}

function format(field: keyof DepartureRow, value: string | DepartureStatus | null): string {
  const formatter = column(field).valueFormatter as ValueFormatterFunc<DepartureRow>;
  return formatter({ value } as ValueFormatterParams<DepartureRow>);
}

const ON_TIME: DepartureStatus = { kind: 'on-time' };
const SCHEDULED: DepartureStatus = { kind: 'scheduled' };
const CANCELLED: DepartureStatus = { kind: 'cancelled' };
const late = (minutes: number): DepartureStatus => ({ kind: 'late', minutes });

describe('departureColumns', () => {
  it('names the place and service columns for the kind of board', () => {
    expect(departureColumns(BUS_BOARD).map((candidate) => candidate.headerName)).toEqual([
      'Departs',
      'Destination',
      'Platform',
      'Bus',
      'Status',
    ]);
  });

  it('has the departure board columns in order', () => {
    expect(DEPARTURE_COLUMNS.map((candidate) => candidate.headerName)).toEqual([
      'Departs',
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

  it('shows the departure time in Finland time', () => {
    expect(format('scheduled', '2026-10-13T11:02:00.000Z')).toBe('14:02');
  });
});

describe('the Departs column', () => {
  const SCHEDULED = '2026-10-13T11:02:00.000Z';
  const departs = (expected: string | null) => {
    const renderer = column('scheduled').cellRenderer as (
      params: ICellRendererParams<DepartureRow>,
    ) => HTMLElement | string;
    return renderer({
      value: SCHEDULED,
      data: { scheduled: SCHEDULED, expected } as DepartureRow,
    } as ICellRendererParams<DepartureRow>) as HTMLElement;
  };

  it('strikes through the timetabled time when the train is expected at another minute', () => {
    const cell = departs('2026-10-13T11:03:48.000Z');

    expect(cell.querySelector('.departs-superseded')?.textContent).toBe('14:02');
    expect(cell.querySelector('.departs-expected')?.textContent).toBe('14:03');
    expect(cell.textContent).toBe('14:02, expected 14:03');
  });

  it('shows the timetabled time alone when the expected time is the same minute', () => {
    const cell = departs('2026-10-13T11:02:30.000Z');

    expect(cell.textContent).toBe('14:02');
    expect(cell.children).toHaveLength(0);
  });

  it('shows the timetabled time alone when Digitraffic expects nothing', () => {
    expect(departs(null).textContent).toBe('14:02');
  });
});

describe('the Status column', () => {
  const compare = column('status').comparator as (
    a: DepartureStatus | null,
    b: DepartureStatus | null,
  ) => number;

  it('says whether a departure is on time, how late it is, or that it is cancelled', () => {
    expect(format('status', ON_TIME)).toBe('On time');
    expect(format('status', SCHEDULED)).toBe('Scheduled');
    expect(format('status', late(2))).toBe('2 min late');
    expect(format('status', CANCELLED)).toBe('Cancelled');
  });

  it('sorts on time first, then scheduled, then by minutes late, then cancelled', () => {
    const sorted = [CANCELLED, late(10), SCHEDULED, ON_TIME, late(2)].sort(compare);

    expect(sorted).toEqual([ON_TIME, SCHEDULED, late(2), late(10), CANCELLED]);
  });

  it('keeps departures with the same status in scheduled order', () => {
    expect(compare(ON_TIME, ON_TIME)).toBe(0);
    expect(compare(late(3), late(3))).toBe(0);
    expect(compare(CANCELLED, CANCELLED)).toBe(0);
  });

  it('marks each status in words, with late and cancelled ones picked out', () => {
    const marks = [ON_TIME, SCHEDULED, late(2), CANCELLED].map(
      (status) => render('status', status) as HTMLElement,
    );

    expect(marks.map((mark) => mark.textContent)).toEqual([
      'On time',
      'Scheduled',
      '2 min late',
      'Cancelled',
    ]);
    expect(marks.map((mark) => mark.className)).toEqual([
      'status status-on-time',
      'status status-scheduled',
      'status status-late',
      'status status-cancelled',
    ]);
  });

  it('shows nothing for a missing status and sorts it first', () => {
    expect(format('status', null)).toBe('');
    expect(render('status', null)).toBe('');
    expect([late(2), null].sort(compare)).toEqual([null, late(2)]);
  });
});

describe('the Track column', () => {
  it('sorts track numbers numerically', () => {
    const compare = column('track').comparator as (a: string, b: string) => number;

    expect(['10', '2', '1', '3b'].sort(compare)).toEqual(['1', '2', '3b', '10']);
  });

  it('puts the track number in a ring, and draws nothing without one', () => {
    const ring = render('track', '3b') as HTMLElement;

    expect(ring.className).toBe('track-marker');
    expect(ring.textContent).toBe('3b');
    expect(render('track', null)).toBe('');
  });

  it('never reads a track as HTML', () => {
    const ring = render('track', '<b>1</b>') as HTMLElement;

    expect(ring.textContent).toBe('<b>1</b>');
    expect(ring.children).toHaveLength(0);
  });
});

describe('compactColumns', () => {
  it('keeps departs, destination, track and status on a narrow board', () => {
    const shown = compactColumns(TRAIN_BOARD).filter((candidate) => !candidate.hide);

    expect(shown.map((candidate) => candidate.headerName)).toEqual([
      'Departs',
      'Destination',
      'Track',
      'Status',
    ]);
  });

  it('uses the short name of the place column, which fits a phone', () => {
    const shown = compactColumns(BUS_BOARD).filter((candidate) => !candidate.hide);

    expect(shown.map((candidate) => candidate.headerName)).toEqual([
      'Departs',
      'Destination',
      'Plat',
      'Status',
    ]);
  });
});
