import type {
  ColDef,
  ICellRendererParams,
  ValueFormatterFunc,
  ValueFormatterParams,
} from 'ag-grid-community';
import { describe, expect, it, vi } from 'vitest';
import type { DepartureRow, DepartureStatus } from '../../data/departures.models';
import { BUS_BOARD, TRAIN_BOARD } from '../board-kind';
import {
  DEFAULT_COLUMN,
  type DestinationActions,
  compactColumns,
  departureColumns,
} from './departure-columns';

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

  it('says the expected time in its text, so the cell redraws when it changes', () => {
    const formatter = column('scheduled').valueFormatter as ValueFormatterFunc<DepartureRow>;
    const text = (expected: string | null) =>
      formatter({
        value: SCHEDULED,
        data: { scheduled: SCHEDULED, expected },
      } as ValueFormatterParams<DepartureRow>);

    expect(text(null)).toBe('14:02');
    expect(text('2026-10-13T11:02:30.000Z')).toBe('14:02');
    expect(text('2026-10-13T11:03:48.000Z')).toBe('14:02, expected 14:03');
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

describe('the Destination column', () => {
  const STATIONS: Readonly<Record<string, string>> = {
    HKI: 'Helsinki',
    'HSL:1000015': 'Kamppi (kaukoliikenneterminaali)',
  };

  function actions(current: string | null = 'TPE') {
    return {
      current: () => current,
      href: (code: string) => `/departures/trains?station=${code}`,
      nameOf: (code: string) => STATIONS[code],
      open: vi.fn<(code: string) => void>(),
      explain: vi.fn<(row: DepartureRow, target: HTMLElement) => void>(),
    } satisfies DestinationActions;
  }

  function cell(
    row: Partial<DepartureRow>,
    context: DestinationActions = actions(),
  ): HTMLElement | string {
    const renderer = column('destination').cellRenderer as (
      params: ICellRendererParams<DepartureRow>,
    ) => HTMLElement | string;
    const data = { destination: 'Helsinki', destinationCode: 'HKI', ...row } as DepartureRow;
    return renderer({
      value: data.destination,
      data,
      context,
    } as ICellRendererParams<DepartureRow>);
  }

  it('links to the board of the station the departure ends at', () => {
    const context = actions();
    const link = cell({}, context) as HTMLAnchorElement;
    const click = new MouseEvent('click', { button: 0, cancelable: true });

    link.dispatchEvent(click);

    expect(link.tagName).toBe('A');
    expect(link.textContent).toBe('Helsinki');
    expect(link.getAttribute('href')).toBe('/departures/trains?station=HKI');
    expect(click.defaultPrevented).toBe(true);
    expect(context.open).toHaveBeenCalledWith('HKI');
  });

  it('leaves a click for a new tab to the browser', () => {
    const context = actions();
    const link = cell({}, context) as HTMLAnchorElement;
    const click = new MouseEvent('click', { button: 0, ctrlKey: true, cancelable: true });

    link.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
    expect(context.open).not.toHaveBeenCalled();
  });

  it('names the station in the link’s title when the destination reads differently', () => {
    const bus = cell({ destinationCode: 'HSL:1000015' }) as HTMLAnchorElement;

    expect(bus.title).toBe('Departures from Kamppi (kaukoliikenneterminaali)');
    expect((cell({}) as HTMLAnchorElement).title).toBe('');
  });

  it('is a button that says why, for a departure that ends at no station on the list', () => {
    const context = actions();
    const button = cell({ destination: 'Lahti', destinationCode: null }, context) as HTMLElement;

    button.click();

    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    expect(context.explain).toHaveBeenCalledWith(
      expect.objectContaining({ destination: 'Lahti' }),
      button,
    );
  });

  it('is plain text for a departure that ends at the station on the board', () => {
    expect(cell({ destination: 'Tampere', destinationCode: 'TPE' })).toBe('Tampere');
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
