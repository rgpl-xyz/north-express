import type { CellClassParams, ColDef, ValueFormatterParams } from 'ag-grid-community';
import { formatFinlandTime } from '../../../../shared/finland-time';
import type { DepartureRow, DepartureStatus } from '../../data/departures.models';

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

/** Bootstrap utility classes, because ag-grid draws its cells outside Angular's style scoping. */
const STATUS_CLASSES: Record<DepartureStatus['kind'], string[]> = {
  'on-time': [],
  late: ['fw-bold', 'text-warning-emphasis'],
  cancelled: ['fw-bold', 'text-danger-emphasis'],
};

function statusClasses(params: CellClassParams<DepartureRow, DepartureStatus>): string[] {
  return params.value ? STATUS_CLASSES[params.value.kind] : [];
}

/** No column sorts by default: rows arrive in the departure board's scheduled order. */
export const DEPARTURE_COLUMNS: ColDef<DepartureRow>[] = [
  {
    headerName: 'Departs',
    field: 'scheduled',
    valueFormatter: formatTime,
    minWidth: 100,
  },
  { headerName: 'Expected', field: 'expected', valueFormatter: formatTime, minWidth: 110 },
  { headerName: 'Destination', field: 'destination', flex: 2, minWidth: 160 },
  {
    headerName: 'Track',
    field: 'track',
    comparator: compareTracks,
    minWidth: 90,
  },
  { headerName: 'Train', field: 'train', minWidth: 130 },
  {
    headerName: 'Status',
    field: 'status',
    valueFormatter: formatStatus,
    comparator: compareStatuses,
    cellClass: statusClasses,
    minWidth: 130,
  },
];

export const DEFAULT_COLUMN: ColDef<DepartureRow> = {
  flex: 1,
  sortable: true,
  resizable: true,
  suppressMovable: true,
};
