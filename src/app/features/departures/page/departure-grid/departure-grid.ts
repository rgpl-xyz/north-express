import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellStyleModule,
  ClientSideRowModelModule,
  ColumnApiModule,
  type GetRowIdParams,
  type GridSizeChangedEvent,
  type Module,
  type RowClassRules,
  RowStyleModule,
  type SortChangedEvent,
  themeQuartz,
} from 'ag-grid-community';
import type { DepartureRow } from '../../data/departures.models';
import { BOARD_KIND } from '../board-kind';
import { dayBreaks } from './day-breaks';
import {
  type BoardRow,
  DEFAULT_COLUMN,
  compactColumns,
  dayBreakOf,
  departureColumns,
} from './departure-columns';

/**
 * Only what this grid uses: client-side rows, CellStyleModule for the column classes,
 * RowStyleModule for the rule above a later day, and ColumnApiModule to read the sort, which
 * says whether the rows are in time order. The track and status markers are function cell
 * renderers, which ag-grid's core draws.
 */
const GRID_MODULES: Module[] = [
  ClientSideRowModelModule,
  CellStyleModule,
  RowStyleModule,
  ColumnApiModule,
];

/** Below this width the board drops its secondary columns (see compactColumns). */
const COMPACT_BELOW_PX = 560;

const INK = '#15171a';

const NO_BREAKS: ReadonlyMap<string, string> = new Map();

/** Quartz as a plain board: white, ruled rows, an ink rule under the header, no column lines. */
const GRID_THEME = themeQuartz.withParams({
  fontFamily: 'inherit',
  fontSize: 16,
  backgroundColor: '#ffffff',
  foregroundColor: INK,
  accentColor: '#0047ab',
  borderColor: 'rgba(21, 23, 26, 0.14)',
  headerBackgroundColor: '#ffffff',
  headerTextColor: INK,
  headerFontFamily: 'Barlow Condensed, sans-serif',
  headerFontSize: 14,
  headerFontWeight: 700,
  headerHeight: 44,
  headerRowBorder: { width: 2, color: INK },
  headerColumnBorder: false,
  headerColumnResizeHandleColor: 'transparent',
  columnBorder: false,
  rowHeight: 68,
  rowHoverColor: 'rgba(0, 71, 171, 0.05)',
  wrapperBorder: false,
  borderRadius: 0,
  wrapperBorderRadius: 0,
});

/** The same board with tighter cells, for the compact columns. */
const COMPACT_GRID_THEME = GRID_THEME.withParams({ cellHorizontalPadding: 8, rowHeight: 64 });

@Component({
  selector: 'app-departure-grid',
  imports: [AgGridAngular],
  template: `
    <ag-grid-angular
      class="board"
      domLayout="autoHeight"
      [theme]="compact() ? compactTheme : theme"
      [modules]="modules"
      [columnDefs]="columns()"
      [defaultColDef]="defaultColumn"
      [rowData]="rowData()"
      [loading]="loading()"
      [getRowId]="rowId"
      [rowClassRules]="rowClassRules"
      [suppressNoRowsOverlay]="true"
      [ensureDomOrder]="true"
      (gridSizeChanged)="onSizeChanged($event)"
      (sortChanged)="onSortChanged($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartureGrid {
  readonly rows = input.required<readonly DepartureRow[]>();
  readonly loading = input(false);

  protected readonly theme = GRID_THEME;
  protected readonly compactTheme = COMPACT_GRID_THEME;
  protected readonly modules = GRID_MODULES;
  protected readonly defaultColumn = DEFAULT_COLUMN;
  protected readonly compact = signal(false);
  private readonly kind = inject(BOARD_KIND);
  private readonly wideColumns = departureColumns(this.kind);
  private readonly narrowColumns = compactColumns(this.kind);
  protected readonly columns = computed(() =>
    this.compact() ? this.narrowColumns : this.wideColumns,
  );
  /** Whether the rows are by scheduled time, as the board gives them: only then do day breaks fit. */
  private readonly scheduledOrder = signal(true);
  /**
   * The rows, with the first departure of each later day carrying the day's name. A copy,
   * as ag-grid wants a mutable array.
   */
  protected readonly rowData = computed((): BoardRow[] => {
    const rows = this.rows();
    const breaks = this.scheduledOrder() ? dayBreaks(rows, new Date()) : NO_BREAKS;
    return rows.map((row) => {
      const dayBreak = breaks.get(row.id);
      return dayBreak ? { ...row, dayBreak } : row;
    });
  });
  /** A later day starts under a heavier rule. */
  protected readonly rowClassRules: RowClassRules<DepartureRow> = {
    'day-break': (params) => Boolean(dayBreakOf(params.data)),
  };

  protected readonly rowId = (params: GetRowIdParams<DepartureRow>) => params.data.id;

  protected onSortChanged(event: SortChangedEvent<DepartureRow>): void {
    const sorted = event.api.getColumnState().filter((column) => column.sort);
    this.scheduledOrder.set(
      sorted.every((column) => column.colId === 'scheduled' && column.sort === 'asc'),
    );
  }

  protected onSizeChanged(event: GridSizeChangedEvent<DepartureRow>): void {
    this.compact.set(event.clientWidth < COMPACT_BELOW_PX);
  }
}
