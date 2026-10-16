import type {
  GridApi,
  ICellRendererParams,
  IRowNode,
  IsFullWidthRowParams,
  RowHeightParams,
} from 'ag-grid-community';
import type { DepartureRow } from '../../data/departures.models';

/** A day line: the day's name on a slim row. */
const DAY_LINE_PX = 36;

/** A note's row until the note is measured: room for its pointer, two lines and a gap. */
const NOTE_LINE_PX = 80;

/** What a note's row keeps besides the note: its pointer's room above, a gap below. */
const NOTE_ROOM_PX = 12 + 10;

/**
 * A row of the board: a departure, or a line across the board that goes with one. A line is
 * a copy of its departure, so it sorts with it and keeps its place.
 */
export interface BoardRow extends DepartureRow {
  /** Above the first departure of a later day: the day's name, such as "Tomorrow". */
  readonly day?: string;
  /** Under a departure whose destination has no board: a note that says so. */
  readonly note?: true;
}

/** What a note needs from the board, through the grid's context. */
export interface NoteContext {
  /** What the board's list holds, such as "bus stations". */
  readonly listName: string;
}

/** The line that starts a later day, above its first departure. */
export function dayLine(row: DepartureRow, day: string): BoardRow {
  return { ...row, id: `${row.id}/day`, day };
}

/** The note under a departure whose destination has no board. */
export function noteLine(row: DepartureRow): BoardRow {
  return { ...row, id: `${row.id}/note`, note: true };
}

export const isBoardLine = (params: IsFullWidthRowParams<BoardRow>) =>
  Boolean(params.rowNode.data?.day ?? params.rowNode.data?.note);

/** A line's height; departures keep the board's. */
export function boardLineHeight(params: RowHeightParams<BoardRow>): number | undefined {
  if (params.data?.day) {
    return DAY_LINE_PX;
  }
  return params.data?.note ? NOTE_LINE_PX : undefined;
}

/** What a note says: what can't be done, then why. */
export function noteText(row: DepartureRow, { listName }: NoteContext): [string, string] {
  return [`Can't show departures from ${row.destination}`, `It isn't in the list of ${listName}.`];
}

/**
 * A line across the board, styled in styles.scss as ag-grid draws it outside Angular's style
 * scoping. The grid makes its row a row; the line is the one cell in it.
 */
export function boardLine(params: ICellRendererParams<BoardRow>): HTMLElement | string {
  const row = params.data;
  if (row?.day) {
    const line = document.createElement('div');
    line.className = 'day-line';
    line.setAttribute('role', 'gridcell');
    line.textContent = row.day;
    return line;
  }
  return row?.note ? destinationNote(row, params) : '';
}

/**
 * The note: an ink strip under the destination, its pointer up at the name. The grid's live
 * region reads it out as well.
 */
function destinationNote(row: BoardRow, params: ICellRendererParams<BoardRow>): HTMLElement {
  const [heading, text] = noteText(row, params.context as NoteContext);
  const note = document.createElement('div');
  note.className = 'destination-note';
  note.setAttribute('role', 'gridcell');
  const left = params.api.getColumn('destination')?.getLeft() ?? 0;
  note.style.setProperty('--destination-left', `${left}px`);
  const title = document.createElement('strong');
  title.textContent = heading;
  // The hidden full stop keeps the two lines apart when they are read out.
  const stop = document.createElement('span');
  stop.className = 'visually-hidden';
  stop.textContent = '.';
  const body = document.createElement('span');
  body.textContent = text;
  note.append(title, stop, ' ', body);
  fitRowToNote(note, params.node, params.api);
  return note;
}

/**
 * Keeps a note's row as tall as the note, whose text wraps on a narrow board. The row
 * changes in the next frame: changing it while the browser reports the note's size would
 * have it report again in the same frame, which it gives up on with an error.
 */
function fitRowToNote(note: HTMLElement, node: IRowNode, api: GridApi): void {
  if (typeof ResizeObserver === 'undefined') {
    return;
  }
  let frame = 0;
  const fit = () => {
    // Not on the board yet, or gone from it.
    if (!note.isConnected) {
      return;
    }
    const height = Math.ceil(note.getBoundingClientRect().height) + NOTE_ROOM_PX;
    if (height !== node.rowHeight) {
      node.setRowHeight(height);
      api.onRowHeightChanged();
    }
  };
  new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fit);
  }).observe(note);
}
