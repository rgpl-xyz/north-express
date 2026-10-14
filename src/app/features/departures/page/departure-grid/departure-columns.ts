import type { ColDef, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { formatFinlandTime } from '../../../../shared/finland-time';
import type { DepartureRow, DepartureStatus } from '../../data/departures.models';
import type { BoardKind } from '../board-kind';

function formatTime(params: ValueFormatterParams<DepartureRow, string | null>): string {
  return formatFinlandTime(params.value);
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
  late: 1,
  cancelled: 2,
};

/** A missing status sorts first, like a missing track. */
function statusRank(status: DepartureStatus | null | undefined): number {
  return status ? STATUS_ORDER[status.kind] : -1;
}

function minutesLate(status: DepartureStatus | null | undefined): number {
  return status?.kind === 'late' ? status.minutes : 0;
}

/** On time first, then by how late, then cancelled. */
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
  const scheduled = formatFinlandTime(params.value);
  const expected = formatFinlandTime(params.data?.expected ?? null);
  if (!scheduled) {
    return '';
  }
  const cell = marker('departs', '');
  if (expected && expected !== scheduled) {
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
      valueFormatter: formatTime,
      cellRenderer: departureTime,
      cellClass: 'board-time',
      minWidth: 150,
    },
    {
      headerName: 'Destination',
      field: 'destination',
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
    { headerName: kind.service, field: 'train', cellClass: 'board-train', minWidth: 120 },
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
 * other columns take less room.
 */
const COMPACT_CHANGES: Readonly<Record<string, Partial<ColDef<DepartureRow>>>> = {
  scheduled: { minWidth: 84 },
  destination: { minWidth: 96 },
  track: { minWidth: 56 },
  train: { hide: true },
  status: { minWidth: 104 },
};

/** The board's columns for a phone-width grid: departs, destination, place and status. */
export function compactColumns(kind: BoardKind): ColDef<DepartureRow>[] {
  return departureColumns(kind).map((column) => ({
    ...column,
    ...COMPACT_CHANGES[column.field ?? ''],
  }));
}

export const DEFAULT_COLUMN: ColDef<DepartureRow> = {
  flex: 1,
  sortable: true,
  resizable: true,
  suppressMovable: true,
};
