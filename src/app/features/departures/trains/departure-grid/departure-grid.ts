import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellStyleModule,
  ClientSideRowModelModule,
  type GetRowIdParams,
  type GridSizeChangedEvent,
  type Module,
  themeQuartz,
} from 'ag-grid-community';
import type { DepartureRow } from '../../data/departures.models';
import { COMPACT_COLUMNS, DEFAULT_COLUMN, DEPARTURE_COLUMNS } from './departure-columns';

/**
 * Only what this grid uses: client-side rows, plus CellStyleModule for the column classes.
 * The track and status markers are function cell renderers, which ag-grid's core draws.
 */
const GRID_MODULES: Module[] = [ClientSideRowModelModule, CellStyleModule];

/** Below this width the board drops its secondary columns (see COMPACT_COLUMNS). */
const COMPACT_BELOW_PX = 560;

const INK = '#15171a';

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
      [suppressNoRowsOverlay]="true"
      [ensureDomOrder]="true"
      (gridSizeChanged)="onSizeChanged($event)"
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
  protected readonly columns = computed(() =>
    this.compact() ? COMPACT_COLUMNS : DEPARTURE_COLUMNS,
  );
  /** ag-grid wants a mutable array; give it a copy rather than the shared input. */
  protected readonly rowData = computed(() => [...this.rows()]);

  protected readonly rowId = (params: GetRowIdParams<DepartureRow>) => params.data.id;

  protected onSizeChanged(event: GridSizeChangedEvent<DepartureRow>): void {
    this.compact.set(event.clientWidth < COMPACT_BELOW_PX);
  }
}
