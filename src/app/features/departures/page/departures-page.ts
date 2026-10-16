import {
  ChangeDetectionStrategy,
  Component,
  afterRenderEffect,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { type BoardAlert, DepartureBoard } from '../board/departure-board';
import { BOARD_KIND } from './board-kind';
import type { DepartureRow, Station } from '../data/departures.models';
import { TrackLine } from '../../../layout/track-line/track-line';
import { ModePictogram } from '../../../shared/mode-pictogram';
import { DepartureGrid } from './departure-grid/departure-grid';
import { NearestStation } from './nearest-station/nearest-station';
import { StationPicker } from './station-picker/station-picker';

const NONE: readonly never[] = [];

/** Renders the departure board; all loading logic and wording live in DepartureBoard. */
@Component({
  selector: 'app-departures-page',
  imports: [StationPicker, DepartureGrid, NearestStation, ModePictogram, TrackLine],
  providers: [DepartureBoard],
  templateUrl: './departures-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeparturesPage {
  protected readonly board = inject(DepartureBoard);
  protected readonly kind = inject(BOARD_KIND);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** The station in the address (?station=TPE), so a reload or a bookmark shows the same board. */
  private readonly stationInUrl = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => params.get('station')?.toLocaleUpperCase('fi') ?? null),
    ),
    { initialValue: null },
  );

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
    // The address leads: once the stations are in, the board shows the one it names.
    effect(() => {
      const code = this.stationInUrl();
      const stations = this.stations();
      if (stations.length === 0) {
        return;
      }
      untracked(() => {
        if (code !== null && !stations.some((station) => station.code === code)) {
          // Not a station, as in an old or mistyped link: take it out of the address.
          void this.showStation(null, true);
        } else if (code !== this.selectedCode()) {
          this.board.selectStation(code);
        }
      });
    });

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

  /** A station picked here goes into the address, and the board follows the address. */
  protected showStation(code: string | null, replaceUrl = false): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { station: code },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  /** The address of a station's board, for the board's destination links. */
  protected readonly stationLink = (code: string): string =>
    this.router.serializeUrl(
      this.router.createUrlTree([], {
        relativeTo: this.route,
        queryParams: { station: code },
        queryParamsHandling: 'merge',
      }),
    );

  /**
   * A destination's board, opened from the board. Its link goes with the old rows, so focus
   * moves up to the heading, which brings the station field, now naming it, into view. Not
   * to the field itself: that would open a phone's keyboard.
   */
  protected openDestination(code: string, heading: HTMLElement): void {
    void this.showStation(code);
    heading.focus();
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
