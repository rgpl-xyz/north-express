import type { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { formatFinlandTime } from '../../../../shared/finland-time';
import type { DepartureRow } from '../../data/departures.models';

function formatTime(params: ValueFormatterParams<DepartureRow, string | null>): string {
  return formatFinlandTime(params.value);
}

const trackOrder = new Intl.Collator('en', { numeric: true });

/** Track "2" before "10"; tracks are strings because some have letters. */
export function compareTracks(a: string | null | undefined, b: string | null | undefined): number {
  return trackOrder.compare(a ?? '', b ?? '');
}

export const DEPARTURE_COLUMNS: ColDef<DepartureRow>[] = [
  {
    headerName: 'Departs',
    field: 'scheduled',
    valueFormatter: formatTime,
    sort: 'asc',
    minWidth: 100,
  },
  { headerName: 'Expected', field: 'expected', valueFormatter: formatTime, minWidth: 110 },
  { headerName: 'Destination', field: 'destination', flex: 2, minWidth: 160 },
  {
    headerName: 'Track',
    field: 'track',
    comparator: (a: string | null, b: string | null) => compareTracks(a, b),
    minWidth: 90,
  },
  { headerName: 'Train', field: 'train', minWidth: 130 },
  {
    headerName: 'Status',
    field: 'status',
    minWidth: 130,
    cellClassRules: {
      'departure-late': (params) => params.data?.statusKind === 'late',
      'departure-cancelled': (params) => params.data?.statusKind === 'cancelled',
    },
  },
];

export const DEFAULT_COLUMN: ColDef<DepartureRow> = {
  flex: 1,
  sortable: true,
  resizable: true,
  suppressMovable: true,
};
