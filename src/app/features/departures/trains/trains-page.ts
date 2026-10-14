import {
  ChangeDetectionStrategy,
  Component,
  afterRenderEffect,
  computed,
  inject,
} from '@angular/core';
import { type BoardAlert, DepartureBoard } from '../board/departure-board';
import type { DepartureRow, Station } from '../data/departures.models';
import { TrackLine } from '../../../layout/track-line/track-line';
import { DepartureGrid } from './departure-grid/departure-grid';
import { StationPicker } from './station-picker/station-picker';

const NONE: readonly never[] = [];

/** Renders the departure board; all loading logic and wording live in DepartureBoard. */
@Component({
  selector: 'app-trains-page',
  imports: [StationPicker, DepartureGrid, TrackLine],
  providers: [DepartureBoard],
  templateUrl: './trains-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainsPage {
  protected readonly board = inject(DepartureBoard);

  /** Set while a Try again runs: where focus goes if it succeeds and its button goes away. */
  private focusAfterRetry: (() => void) | null = null;

  protected readonly stations = computed((): readonly Station[] => {
    const stations = this.board.stations();
    return stations.kind === 'loaded' ? stations.stations : NONE;
  });

  protected readonly selectedCode = computed(() => {
    const state = this.board.state();
    return state.kind === 'idle' ? null : state.station.code;
  });

  protected readonly rows = computed((): readonly DepartureRow[] => {
    const state = this.board.state();
    return 'rows' in state ? state.rows : NONE;
  });

  protected readonly loading = computed(() => this.board.state().kind === 'loading');

  /** Departures to show, or some on the way; otherwise the status line says why there are none. */
  protected readonly showBoard = computed(() => this.rows().length > 0 || this.loading());

  protected readonly canRefresh = computed(() => {
    const { kind } = this.board.state();
    return kind !== 'idle' && kind !== 'loading';
  });

  constructor() {
    // When a retry succeeds its alert, and the focused Try again button, are removed.
    // Move focus to the control the user needs next instead of letting it drop to <body>.
    // If the retry fails, the same button stays and keeps focus.
    afterRenderEffect(() => {
      const alert = this.board.alert();
      const focusNext = this.focusAfterRetry;
      if (!focusNext || alert?.busy) {
        return;
      }
      this.focusAfterRetry = null;
      if (!alert) {
        focusNext();
      }
    });
  }

  /** The picker after stations load; Refresh after departures load (loaded or empty). */
  protected tryAgain(
    alert: BoardAlert,
    picker: StationPicker,
    refreshButton: HTMLButtonElement,
  ): void {
    if (alert.busy) {
      return;
    }
    this.focusAfterRetry =
      alert.action === 'retry-stations' ? () => picker.focus() : () => refreshButton.focus();
    if (alert.action === 'retry-stations') {
      this.board.retryStations();
    } else {
      this.board.refresh();
    }
  }
}
