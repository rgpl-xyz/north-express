import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type Observable, Subject, catchError, map, of, switchMap } from 'rxjs';
import { formatFinlandClock, formatFinlandTime } from '../../../shared/finland-time';
import { DepartureSource } from '../data/departure-source';
import type { DepartureRow, Station } from '../data/departures.models';

export interface StationsLoaded {
  readonly kind: 'loaded';
  readonly stations: readonly Station[];
}

export interface StationsFailed {
  readonly kind: 'failed';
}

export interface StationsLoading {
  readonly kind: 'loading';
  /** The outcome being retried, or null on the first load. */
  readonly previous: StationsLoaded | StationsFailed | null;
}

export type StationsState = StationsLoading | StationsLoaded | StationsFailed;

export interface IdleBoard {
  readonly kind: 'idle';
}

export interface LoadedBoard {
  readonly kind: 'loaded';
  readonly station: Station;
  readonly rows: readonly DepartureRow[];
  readonly updatedAt: Date;
}

export interface EmptyBoard {
  readonly kind: 'empty';
  readonly station: Station;
  readonly updatedAt: Date;
}

/** Nothing could be loaded and there are no earlier rows to show. */
export interface FailedBoard {
  readonly kind: 'failed';
  readonly station: Station;
}

/** A refresh failed; `rows` and `updatedAt` are from the last successful load. */
export interface StaleBoard {
  readonly kind: 'stale';
  readonly station: Station;
  readonly rows: readonly DepartureRow[];
  readonly updatedAt: Date;
}

/** A board that has finished loading one station, one way or another. */
export type SettledBoard = LoadedBoard | EmptyBoard | FailedBoard | StaleBoard;

export interface LoadingBoard {
  readonly kind: 'loading';
  readonly station: Station;
  /** The rows already on screen for this station, kept while it reloads. */
  readonly rows: readonly DepartureRow[];
  /** What this station's board showed before the reload, or null for a new station. */
  readonly previous: SettledBoard | null;
}

export type BoardState = IdleBoard | LoadingBoard | SettledBoard;

/** Text for the page's live region, and whether sighted users need to see it too. */
export interface BoardStatus {
  readonly text: string;
  readonly visible: boolean;
}

export type BoardAlertAction = 'retry-stations' | 'refresh';

/**
 * A load failure to show inline, with the Try again action that fixes it. `busy` is
 * true while that action runs: the alert stays up until it succeeds.
 */
export interface BoardAlert {
  readonly text: string;
  readonly action: BoardAlertAction;
  readonly busy: boolean;
}

const LOADING_STATIONS = 'Loading stations…';
const STATIONS_FAILED = "Couldn't load stations.";
const NO_STATIONS = 'No stations available.';
const CHOOSE_STATION = 'Choose a station to see its next departures.';

/** What is wrong with a stations outcome, from the user's point of view, if anything. */
function stationsProblem(stations: StationsLoaded | StationsFailed | null): string | null {
  if (stations?.kind === 'failed') {
    return STATIONS_FAILED;
  }
  return stations?.kind === 'loaded' && stations.stations.length === 0 ? NO_STATIONS : null;
}

function stationPrompt(stations: StationsState): string {
  if (stations.kind === 'loading') {
    return LOADING_STATIONS;
  }
  return stationsProblem(stations) ?? 'Choose a station';
}

function departuresFailed(station: Station): string {
  return `Couldn't load departures from ${station.name}.`;
}

function showingStale(updatedAt: Date): string {
  return `Couldn't refresh. Showing departures from ${formatFinlandTime(updatedAt)}.`;
}

/** The settled board on screen: the state itself, or what a reload keeps showing. */
function settledOf(board: BoardState): SettledBoard | null {
  if (board.kind === 'idle') {
    return null;
  }
  return board.kind === 'loading' ? board.previous : board;
}

function departuresAlert(board: BoardState): BoardAlert | null {
  const settled = settledOf(board);
  const busy = board.kind === 'loading';
  if (settled?.kind === 'failed') {
    return { text: departuresFailed(settled.station), action: 'refresh', busy };
  }
  if (settled?.kind === 'stale') {
    return { text: showingStale(settled.updatedAt), action: 'refresh', busy };
  }
  return null;
}

function stationsAlert(stations: StationsState): BoardAlert | null {
  const busy = stations.kind === 'loading';
  const problem = stationsProblem(busy ? stations.previous : stations);
  return problem ? { text: problem, action: 'retry-stations', busy } : null;
}

function alertFor(stations: StationsState, board: BoardState): BoardAlert | null {
  return departuresAlert(board) ?? stationsAlert(stations);
}

/** Hidden when something else on screen (grid, alert, picker) already says it. */
function statusFor(stations: StationsState, board: BoardState): BoardStatus {
  switch (board.kind) {
    case 'idle': {
      if (stations.kind === 'loading' && stations.previous) {
        return { text: LOADING_STATIONS, visible: false };
      }
      const problem = stationsProblem(stations.kind === 'loading' ? null : stations);
      return problem ? { text: problem, visible: false } : { text: CHOOSE_STATION, visible: true };
    }
    case 'loading':
      return { text: `Loading departures from ${board.station.name}…`, visible: false };
    case 'loaded': {
      const count = board.rows.length;
      const noun = count === 1 ? 'departure' : 'departures';
      return { text: `${count} ${noun} from ${board.station.name}.`, visible: false };
    }
    case 'empty':
      return {
        text: `No departures from ${board.station.name} in the coming hours.`,
        visible: true,
      };
    case 'failed':
      return { text: departuresFailed(board.station), visible: false };
    case 'stale':
      return { text: showingStale(board.updatedAt), visible: false };
  }
}

/** What a reload of `station` keeps showing: the same station's settled board, if any. */
function previousFor(current: BoardState, station: Station): SettledBoard | null {
  if (current.kind === 'idle' || current.station.code !== station.code) {
    return null;
  }
  return settledOf(current);
}

/** A failed reload keeps earlier rows as stale; with no rows to keep, it has failed. */
function afterFailure(loading: LoadingBoard): SettledBoard {
  const { previous, station } = loading;
  if (previous?.kind === 'loaded' || previous?.kind === 'stale') {
    return { kind: 'stale', station, rows: previous.rows, updatedAt: previous.updatedAt };
  }
  return { kind: 'failed', station };
}

/**
 * The trains page's departure board: which stations can be chosen, what the board
 * shows for the chosen one, and every user-facing message about loading and load
 * failures. Load failures are board states shown inline, never toasts.
 *
 * One per page (provided in TrainsPage). A newer selectStation or refresh cancels
 * the request before it. A failed refresh keeps the rows already shown, marked stale.
 */
@Injectable()
export class DepartureBoard {
  private readonly source = inject(DepartureSource);
  private readonly stationRequests = new Subject<void>();
  private readonly departureRequests = new Subject<LoadingBoard | null>();
  private readonly stationsState = signal<StationsState>({ kind: 'loading', previous: null });
  private readonly boardState = signal<BoardState>({ kind: 'idle' });

  readonly stations = this.stationsState.asReadonly();
  readonly state = this.boardState.asReadonly();

  /** First option of the station picker. */
  readonly stationPrompt = computed(() => stationPrompt(this.stations()));
  readonly status = computed(() => statusFor(this.stations(), this.state()));
  readonly alert = computed(() => alertFor(this.stations(), this.state()));
  readonly lastUpdated = computed(() => {
    const settled = settledOf(this.state());
    return settled && 'updatedAt' in settled
      ? `Last updated ${formatFinlandClock(settled.updatedAt)}.`
      : '';
  });

  constructor() {
    this.stationRequests
      .pipe(
        switchMap(() =>
          this.source.stations().pipe(
            map((stations): StationsState => ({ kind: 'loaded', stations })),
            catchError(() => of<StationsState>({ kind: 'failed' })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((stations) => this.stationsState.set(stations));

    this.departureRequests
      .pipe(
        switchMap((loading) =>
          loading ? this.fetchDepartures(loading) : of<BoardState>({ kind: 'idle' }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.boardState.set(state));

    this.loadStations();
  }

  /** Shows the departures of a station, or clears the board for null. */
  selectStation(code: string | null): void {
    this.request(code === null ? null : this.findStation(code));
  }

  /** Loads the chosen station again. Does nothing while idle. */
  refresh(): void {
    const state = this.boardState();
    if (state.kind !== 'idle') {
      this.request(state.station);
    }
  }

  retryStations(): void {
    this.loadStations();
  }

  private loadStations(): void {
    const current = this.stationsState();
    const previous = current.kind === 'loading' ? current.previous : current;
    this.stationsState.set({ kind: 'loading', previous });
    this.stationRequests.next();
  }

  private findStation(code: string): Station {
    const stations = this.stationsState();
    const station =
      stations.kind === 'loaded' ? stations.stations.find((s) => s.code === code) : undefined;
    return station ?? { code, name: code };
  }

  private request(station: Station | null): void {
    if (!station) {
      this.departureRequests.next(null);
      return;
    }
    // Rows and times of another station never carry over.
    const previous = previousFor(this.boardState(), station);
    const rows = previous && 'rows' in previous ? previous.rows : [];
    const loading: LoadingBoard = { kind: 'loading', station, rows, previous };
    this.boardState.set(loading);
    this.departureRequests.next(loading);
  }

  private fetchDepartures(loading: LoadingBoard): Observable<BoardState> {
    const { station } = loading;
    return this.source.departures(station.code).pipe(
      map((rows): BoardState => {
        const updatedAt = new Date();
        return rows.length > 0
          ? { kind: 'loaded', station, rows, updatedAt }
          : { kind: 'empty', station, updatedAt };
      }),
      catchError(() => of(afterFailure(loading))),
    );
  }
}
