import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  type CellKeyDownEvent,
  type FullWidthCellKeyDownEvent,
  CellStyleModule,
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  ColumnApiModule,
  type GetRowIdParams,
  type GridSizeChangedEvent,
  type Module,
  type SortChangedEvent,
  themeQuartz,
} from 'ag-grid-community';
import type { DepartureRow, Station } from '../../data/departures.models';
import { BOARD_KIND } from '../board-kind';
import {
  type BoardRow,
  type NoteContext,
  boardLine,
  boardLineHeight,
  dayLine,
  isBoardLine,
  noteLine,
  noteText,
} from './board-lines';
import { dayBreaks } from './day-breaks';
import {
  DEFAULT_COLUMN,
  type DestinationActions,
  compactColumns,
  leastWidth,
  departureColumns,
} from './departure-columns';

/**
 * Only what this grid uses: client-side rows, ClientSideRowModelApiModule for a note's row
 * to take the note's height, CellStyleModule for the column classes, and ColumnApiModule to
 * read the sort, which says whether the rows are in time order, and where the Destination
 * column is. The markers and the lines across the board are function renderers, which
 * ag-grid's core draws.
 */
const GRID_MODULES: Module[] = [
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  CellStyleModule,
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
    <!-- Drawn once the board's width is known, so it starts in the layout that fits it. -->
    @if (measured()) {
      <ag-grid-angular
        class="board"
        [class.compact]="compact()"
        domLayout="autoHeight"
        [theme]="compact() ? compactTheme : theme"
        [modules]="modules"
        [columnDefs]="columns()"
        [defaultColDef]="defaultColumn"
        [rowData]="rowData()"
        [loading]="loading()"
        [getRowId]="rowId"
        [context]="context"
        [isFullWidthRow]="isLine"
        [fullWidthCellRenderer]="lineRenderer"
        [getRowHeight]="rowHeight"
        [suppressNoRowsOverlay]="true"
        [ensureDomOrder]="true"
        (gridSizeChanged)="onSizeChanged($event)"
        (sortChanged)="onSortChanged($event)"
        (cellKeyDown)="onCellKeyDown($event)"
      />
    }
    <!-- The note's words, read out when it opens; the note on the board isn't a live region. -->
    <p class="visually-hidden" role="status">{{ announcement() }}</p>
  `,
  // A block, so it has the board's width to measure before the grid is in it.
  styles: ':host { display: block; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartureGrid {
  readonly rows = input.required<readonly DepartureRow[]>();
  readonly loading = input(false);
  /** The station on the board, and the list its destinations are looked up in. */
  readonly station = input<string | null>(null);
  readonly stations = input<readonly Station[]>([]);
  /** The address of a station's board. */
  readonly stationLink = input<(code: string) => string>(() => '');
  /** A destination's station, picked from its link. */
  readonly stationPicked = output<string>();

  protected readonly theme = GRID_THEME;
  protected readonly compactTheme = COMPACT_GRID_THEME;
  protected readonly modules = GRID_MODULES;
  protected readonly defaultColumn = DEFAULT_COLUMN;
  protected readonly isLine = isBoardLine;
  protected readonly lineRenderer = boardLine;
  protected readonly rowHeight = boardLineHeight;
  /** The board's width, measured before the grid draws, then as ag-grid reports it. */
  private readonly boardWidth = signal(0);
  protected readonly compact = computed(() => this.boardWidth() < COMPACT_BELOW_PX);
  /** Whether the board's width has been measured, which the grid waits for. */
  protected readonly measured = signal(false);
  private readonly kind = inject(BOARD_KIND);
  private readonly wideColumns = departureColumns(this.kind);
  private readonly narrowColumns = compactColumns(this.kind);
  private readonly narrowColumnsInFull = compactColumns(this.kind, true);
  /** The narrowest board on which the phone columns name the place in full ("Platform"). */
  private readonly placeInFullFrom = leastWidth(this.narrowColumnsInFull);
  protected readonly columns = computed(() => {
    if (!this.compact()) {
      return this.wideColumns;
    }
    return this.boardWidth() >= this.placeInFullFrom
      ? this.narrowColumnsInFull
      : this.narrowColumns;
  });
  /** Whether the rows are by scheduled time, as the board gives them: only then do day breaks fit. */
  private readonly scheduledOrder = signal(true);
  /** The departure whose destination has no board, with the note saying so under it. */
  private readonly noted = signal<DepartureRow | null>(null);
  /** The button that opened the note, which closes it again. */
  private noteTrigger: HTMLElement | null = null;
  /**
   * The rows, with a line naming each later day above its first departure, and the note
   * under the departure it is about. A copy, as ag-grid wants a mutable array.
   */
  protected readonly rowData = computed((): BoardRow[] => {
    const rows = this.rows();
    const breaks = this.scheduledOrder() ? dayBreaks(rows, new Date()) : NO_BREAKS;
    const noted = this.noted()?.id;
    return rows.flatMap((row) => {
      const day = breaks.get(row.id);
      const lines = day ? [dayLine(row, day), row] : [row];
      return row.id === noted ? [...lines, noteLine(row)] : lines;
    });
  });

  protected readonly rowId = (params: GetRowIdParams<DepartureRow>) => params.data.id;

  /** What the cells and the note ask of the board (see DestinationActions, NoteContext). */
  protected readonly context: DestinationActions & NoteContext = {
    listName: this.kind.mode === 'bus' ? 'bus stations' : 'stations',
    current: () => this.station(),
    href: (code) => this.stationLink()(code),
    nameOf: (code) => this.stations().find((station) => station.code === code)?.name,
    open: (code) => {
      this.closeNote();
      this.stationPicked.emit(code);
    },
    explain: (row, target) => this.toggleNote(row, target),
  };

  protected readonly announcement = computed(() => {
    const noted = this.noted();
    return noted ? noteText(noted, this.context).join('. ') : '';
  });

  constructor() {
    // The phone or the full columns from the start. ag-grid reports its size a task after it
    // first draws, so on a slow phone the full columns showed, cut off, until the switch.
    // Later changes, such as a phone turned sideways, still come from that report.
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => {
      this.boardWidth.set(host.clientWidth);
      this.measured.set(true);
    });
    // New rows may not have the departure the note is about.
    effect(() => {
      this.rows();
      this.closeNote();
    });
    // Escape, or a press anywhere but the note or its destination, closes the note. Heard
    // before the grid, which keeps the keys pressed in its cells to itself.
    const document = inject(DOCUMENT);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.closeNote();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest('.destination-note') && !this.noteTrigger?.contains(target)) {
        this.closeNote();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    });
  }

  /**
   * Enter on a Destination cell does what a click on its link or button does: the grid
   * moves the keyboard from cell to cell, so the link itself never has focus.
   */
  protected onCellKeyDown(
    event: CellKeyDownEvent<DepartureRow> | FullWidthCellKeyDownEvent<DepartureRow>,
  ): void {
    const key = event.event as KeyboardEvent | null | undefined;
    if (key?.key !== 'Enter' || !('column' in event) || event.column.getColId() !== 'destination') {
      return;
    }
    const cell = key.target as HTMLElement | null;
    cell?.querySelector<HTMLElement>('.destination-link')?.click();
  }

  protected onSortChanged(event: SortChangedEvent<DepartureRow>): void {
    this.closeNote();
    const sorted = event.api.getColumnState().filter((column) => column.sort);
    this.scheduledOrder.set(
      sorted.every((column) => column.colId === 'scheduled' && column.sort === 'asc'),
    );
  }

  protected onSizeChanged(event: GridSizeChangedEvent<DepartureRow>): void {
    this.boardWidth.set(event.clientWidth);
  }

  private closeNote(): void {
    this.noted.set(null);
    this.noteTrigger = null;
  }

  /** Opens the note under a departure, or closes it when it is already open there. */
  private toggleNote(row: DepartureRow, trigger: HTMLElement): void {
    if (this.noted()?.id === row.id) {
      this.closeNote();
      return;
    }
    this.noted.set(row);
    this.noteTrigger = trigger;
  }
}
