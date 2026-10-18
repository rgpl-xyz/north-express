import type { ColDef, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { formatFinlandTime } from '../../../../shared/finland-time';
import type { DepartureRow, DepartureStatus } from '../../data/departures.models';
import type { BoardKind } from '../board-kind';

/**
 * What the Destination cells need from the board, through the grid's context: the station
 * on the board, each listed station's address and name, and what a click does.
 */
export interface DestinationActions {
  /** The station on the board, whose own departures have nothing to open. */
  current(): string | null;
  /** The address of a station's board, so the link works as a link: a new tab, a copy. */
  href(code: string): string;
  nameOf(code: string): string | undefined;
  /** Opens the board of the station a departure ends at. */
  open(code: string): void;
  /** Says, next to the cell, that a departure ends at no station on the list. */
  explain(row: DepartureRow, target: HTMLElement): void;
}

/**
 * What the Departs cell shows: the timetabled time, and the expected one when it is another
 * minute, or an empty string.
 */
function departsParts(scheduledAt: string | null | undefined, row: DepartureRow | undefined) {
  const scheduled = formatFinlandTime(scheduledAt);
  const expected = formatFinlandTime(row?.expected ?? null);
  return { scheduled, expected: expected !== scheduled ? expected : '' };
}

/**
 * The Departs cell in words, "14:02, expected 14:03". ag-grid redraws a cell only when its
 * value or this text changes, and the value is the timetabled time alone, so the text has to
 * carry the expected time for the cell to keep up with it.
 */
function departsText(params: ValueFormatterParams<DepartureRow, string | null>): string {
  const { scheduled, expected } = departsParts(params.value, params.data);
  if (!scheduled) {
    return '';
  }
  return expected ? `${scheduled}, expected ${expected}` : scheduled;
}

const trackOrder = new Intl.Collator('en', { numeric: true });

/** Track "2" before "10"; tracks are strings because some have letters. */
function compareTracks(a: string | null | undefined, b: string | null | undefined): number {
  return trackOrder.compare(a ?? '', b ?? '');
}

function statusText(status: DepartureStatus): string {
  switch (status.kind) {
    case 'on-time':
      return 'On time';
    case 'scheduled':
      return 'Scheduled';
    case 'late':
      return `${status.minutes} min late`;
    case 'cancelled':
      return 'Cancelled';
  }
}

function formatStatus(params: ValueFormatterParams<DepartureRow, DepartureStatus>): string {
  return params.value ? statusText(params.value) : '';
}

const STATUS_ORDER: Record<DepartureStatus['kind'], number> = {
  'on-time': 0,
  scheduled: 1,
  late: 2,
  cancelled: 3,
};

/** A missing status sorts first, like a missing track. */
function statusRank(status: DepartureStatus | null | undefined): number {
  return status ? STATUS_ORDER[status.kind] : -1;
}

function minutesLate(status: DepartureStatus | null | undefined): number {
  return status?.kind === 'late' ? status.minutes : 0;
}

/** On time first, then scheduled (no live data), then by how late, then cancelled. */
function compareStatuses(
  a: DepartureStatus | null | undefined,
  b: DepartureStatus | null | undefined,
): number {
  return statusRank(a) - statusRank(b) || minutesLate(a) - minutesLate(b);
}

/** A span with the given text and classes; textContent, so the text is never read as HTML. */
function marker(className: string, text: string): HTMLElement {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  return element;
}

/**
 * The departure time. Where Digitraffic expects the train at another minute, the
 * timetabled time is struck through and the expected one follows it at full size:
 * that is the time to be on the platform. Screen readers hear "14:02, expected 14:03".
 */
function departureTime(
  params: ICellRendererParams<DepartureRow, string | null>,
): HTMLElement | string {
  const { scheduled, expected } = departsParts(params.value, params.data);
  if (!scheduled) {
    return '';
  }
  const cell = marker('departs', '');
  if (expected) {
    cell.append(
      marker('departs-superseded', scheduled),
      marker('visually-hidden', ', expected '),
      marker('departs-expected', expected),
    );
  } else {
    cell.textContent = scheduled;
  }
  return cell;
}

/**
 * The service in words, "OB3, OnniBus": the route and who runs it. ag-grid redraws a cell
 * only when its value or this text changes, so the text carries the operator too.
 */
function serviceText(params: ValueFormatterParams<DepartureRow, string>): string {
  const operator = params.data?.operator;
  return operator ? `${params.value ?? ''}, ${operator}` : (params.value ?? '');
}

/** A bus route's number with its operator under it, smaller; anything else as it is. */
function serviceCell(params: ICellRendererParams<DepartureRow, string>): HTMLElement | string {
  const service = params.value ?? '';
  const operator = params.data?.operator;
  if (!operator) {
    return service;
  }
  const cell = marker('service', '');
  cell.append(service, marker('visually-hidden', ', '), marker('service-operator', operator));
  return cell;
}

/** A click that opens a link where the user asked for it, such as a new tab, not here. */
function opensElsewhere(event: MouseEvent): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

/**
 * The destination, as a link to the board of the station the departure ends at. Where it
 * ends at no station on the list, a button that says so instead; where it ends at the
 * station on the board, as a loop does, plain text.
 */
function destinationCell(params: ICellRendererParams<DepartureRow, string>): HTMLElement | string {
  const row = params.data;
  const actions = params.context as DestinationActions | undefined;
  if (!row || !actions) {
    return params.value ?? '';
  }
  const code = row.destinationCode;
  if (code !== null && code === actions.current()) {
    return row.destination;
  }
  if (code === null) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'destination-link';
    button.textContent = row.destination;
    button.addEventListener('click', () => actions.explain(row, button));
    return button;
  }
  const link = document.createElement('a');
  link.className = 'destination-link';
  link.href = actions.href(code);
  link.textContent = row.destination;
  const name = actions.nameOf(code);
  if (name && name !== row.destination) {
    link.title = `Departures from ${name}`;
  }
  link.addEventListener('click', (event) => {
    if (!opensElsewhere(event)) {
      event.preventDefault();
      actions.open(code);
    }
  });
  return link;
}

/** The track number in a ring, like a platform marker. The ring is styled in styles.scss. */
function trackMarker(
  params: ICellRendererParams<DepartureRow, string | null>,
): HTMLElement | string {
  return params.value ? marker('track-marker', params.value) : '';
}

/**
 * The status in words, marked by kind: late in yellow, cancelled in red (styles.scss,
 * because ag-grid draws its cells outside Angular's style scoping).
 */
function statusMarker(
  params: ICellRendererParams<DepartureRow, DepartureStatus | null>,
): HTMLElement | string {
  return params.value ? marker(`status status-${params.value.kind}`, statusText(params.value)) : '';
}

/**
 * The board's columns, the place and service ones named for the kind of board. No column
 * sorts by default: rows arrive in the departure board's scheduled order.
 */
export function departureColumns(kind: BoardKind): ColDef<DepartureRow>[] {
  return [
    {
      headerName: 'Departs',
      field: 'scheduled',
      valueFormatter: departsText,
      cellRenderer: departureTime,
      cellClass: 'board-time',
      minWidth: 150,
    },
    {
      headerName: 'Destination',
      field: 'destination',
      cellRenderer: destinationCell,
      cellClass: 'board-destination',
      flex: 1.5,
      minWidth: 120,
    },
    {
      headerName: kind.place,
      field: 'track',
      comparator: compareTracks,
      cellRenderer: trackMarker,
      cellClass: 'board-center',
      headerClass: 'board-center',
      minWidth: 84,
    },
    {
      headerName: kind.service,
      field: 'train',
      valueFormatter: serviceText,
      cellRenderer: serviceCell,
      cellClass: 'board-train',
      minWidth: 120,
    },
    {
      headerName: 'Status',
      field: 'status',
      valueFormatter: formatStatus,
      comparator: compareStatuses,
      cellRenderer: statusMarker,
      minWidth: 130,
    },
  ];
}

/**
 * A narrow board: the service column gives way so the status stays on screen, and the
 * other columns take less room. Together they fit the board on a 360px phone, 336px.
 */
const COMPACT_CHANGES: Readonly<Record<string, Partial<ColDef<DepartureRow>>>> = {
  scheduled: { minWidth: 84 },
  destination: { minWidth: 96 },
  track: { minWidth: 56 },
  train: { hide: true },
  // Room for the widest status, "2 min late".
  status: { minWidth: 98 },
};

/** Room for "Platform" in the header's type, with the cell's padding. */
const PLACE_IN_FULL_PX = 80;

/**
 * The board's columns for a phone-width grid: departs, destination, place and status. The
 * place column has its short name, such as "Plat", unless `placeInFull`, when it is wide
 * enough for the full one.
 */
export function compactColumns(kind: BoardKind, placeInFull = false): ColDef<DepartureRow>[] {
  const shortened = kind.placeShort !== kind.place;
  const place = placeInFull ? kind.place : kind.placeShort;
  return departureColumns({ ...kind, place }).map((column) => ({
    ...column,
    ...COMPACT_CHANGES[column.field ?? ''],
    ...(column.field === 'track' && placeInFull && shortened && { minWidth: PLACE_IN_FULL_PX }),
  }));
}

/** The narrowest board these columns fit, each at its least width. */
export function leastWidth(columns: readonly ColDef<DepartureRow>[]): number {
  return columns
    .filter((column) => !column.hide)
    .reduce((width, column) => width + (column.minWidth ?? 0), 0);
}

export const DEFAULT_COLUMN: ColDef<DepartureRow> = {
  flex: 1,
  sortable: true,
  resizable: true,
  suppressMovable: true,
};
