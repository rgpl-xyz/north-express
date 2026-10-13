import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellStyleModule,
  ClientSideRowModelModule,
  type GetRowIdParams,
  type Module,
  themeQuartz,
} from 'ag-grid-community';
import type { DepartureRow } from '../../data/departures.models';
import { DEFAULT_COLUMN, DEPARTURE_COLUMNS } from './departure-columns';

/** Only what this grid uses: client-side rows, plus CellStyleModule for the status colours. */
const GRID_MODULES: Module[] = [ClientSideRowModelModule, CellStyleModule];

/** Quartz, toned to match Bootswatch Lux. */
const GRID_THEME = themeQuartz.withParams({
  fontFamily: 'inherit',
  fontSize: 15,
  headerFontWeight: 600,
  accentColor: '#1a1a1a',
  foregroundColor: '#1a1a1a',
  headerTextColor: '#55595c',
  borderRadius: 0,
  wrapperBorderRadius: 0,
});

@Component({
  selector: 'app-departure-grid',
  imports: [AgGridAngular],
  template: `
    <ag-grid-angular
      domLayout="autoHeight"
      [theme]="theme"
      [modules]="modules"
      [columnDefs]="columns"
      [defaultColDef]="defaultColumn"
      [rowData]="rowData()"
      [loading]="loading()"
      [getRowId]="rowId"
      [suppressNoRowsOverlay]="true"
      [ensureDomOrder]="true"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartureGrid {
  readonly rows = input.required<readonly DepartureRow[]>();
  readonly loading = input(false);

  protected readonly theme = GRID_THEME;
  protected readonly modules = GRID_MODULES;
  protected readonly columns = DEPARTURE_COLUMNS;
  protected readonly defaultColumn = DEFAULT_COLUMN;
  /** ag-grid wants a mutable array; give it a copy rather than the shared input. */
  protected readonly rowData = computed(() => [...this.rows()]);

  protected readonly rowId = (params: GetRowIdParams<DepartureRow>) => params.data.id;
}
