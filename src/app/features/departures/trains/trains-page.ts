import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type Observable, Subject, catchError, map, of, switchMap } from 'rxjs';
import { NotificationService } from '../../../core/notifications/notification.service';
import { formatFinlandClock } from '../../../shared/finland-time';
import type { DepartureRow, Station } from '../data/departures.models';
import { DigitrafficService } from '../data/digitraffic.service';
import { DepartureGrid } from './departure-grid/departure-grid';
import { StationPicker } from './station-picker/station-picker';

export const STATIONS_ERROR_TITLE = 'Stations unavailable';
export const STATIONS_ERROR_MESSAGE =
  "Couldn't load stations from Digitraffic. Press Try again to reload them.";
export const DEPARTURES_ERROR_TITLE = 'Departures unavailable';
export const DEPARTURES_ERROR_MESSAGE =
  "Couldn't load departures from Digitraffic. Try again in a moment.";

interface StationsResult {
  readonly stations: readonly Station[];
  readonly failed: boolean;
}

interface DeparturesResult {
  readonly rows: readonly DepartureRow[];
  readonly updatedAt: Date | null;
}

/** What the live region says, and whether sighted users need to see it too. */
interface StatusMessage {
  readonly text: string;
  readonly visible: boolean;
}

const NO_DEPARTURES: DeparturesResult = { rows: [], updatedAt: null };

@Component({
  selector: 'app-trains-page',
  imports: [StationPicker, DepartureGrid],
  templateUrl: './trains-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainsPage {
  private readonly digitraffic = inject(DigitrafficService);
  private readonly notifications = inject(NotificationService);

  private readonly stationRequests = new Subject<void>();
  /** Each value asks for the departures of a station; null clears the board. */
  private readonly departureRequests = new Subject<string | null>();

  protected readonly stations = signal<readonly Station[]>([]);
  protected readonly stationsLoading = signal(true);
  protected readonly stationsFailed = signal(false);
  protected readonly selectedCode = signal<string | null>(null);
  protected readonly departures = signal<readonly DepartureRow[]>([]);
  protected readonly departuresLoading = signal(false);
  protected readonly lastUpdated = signal<Date | null>(null);

  private readonly stationNames = computed(
    () => new Map(this.stations().map((station) => [station.code, station.name])),
  );

  protected readonly lastUpdatedText = computed(() => formatFinlandClock(this.lastUpdated()));

  protected readonly status = computed((): StatusMessage => {
    const code = this.selectedCode();
    if (!code) {
      // When the stations failed, the inline alert and the toast already say so.
      return this.stationsFailed()
        ? { text: '', visible: false }
        : { text: 'Choose a station to see its next departures.', visible: true };
    }
    const name = this.stationNames().get(code) ?? code;
    if (this.departuresLoading()) {
      return { text: `Loading departures from ${name}…`, visible: false };
    }
    const count = this.departures().length;
    if (count > 0) {
      const noun = count === 1 ? 'departure' : 'departures';
      return { text: `${count} ${noun} from ${name}.`, visible: false };
    }
    if (!this.lastUpdated()) {
      return { text: `Departures from ${name} couldn't be loaded.`, visible: true };
    }
    return { text: `No departures from ${name} in the coming hours.`, visible: true };
  });

  constructor() {
    // switchMap drops the answer to an older request when a newer one starts.
    this.stationRequests
      .pipe(
        switchMap(() => this.fetchStations()),
        takeUntilDestroyed(),
      )
      .subscribe(({ stations, failed }) => {
        this.stations.set(stations);
        this.stationsFailed.set(failed);
        this.stationsLoading.set(false);
      });

    this.departureRequests
      .pipe(
        switchMap((code) => (code ? this.fetchDepartures(code) : of(NO_DEPARTURES))),
        takeUntilDestroyed(),
      )
      .subscribe(({ rows, updatedAt }) => {
        this.departures.set(rows);
        this.lastUpdated.set(updatedAt);
        this.departuresLoading.set(false);
      });

    this.loadStations();
  }

  protected loadStations(): void {
    this.stationsLoading.set(true);
    this.stationsFailed.set(false);
    this.stationRequests.next();
  }

  protected selectStation(code: string | null): void {
    this.selectedCode.set(code);
    this.requestDepartures(code);
  }

  protected refresh(): void {
    this.requestDepartures(this.selectedCode());
  }

  private requestDepartures(code: string | null): void {
    this.departuresLoading.set(code !== null);
    this.departureRequests.next(code);
  }

  /** Never errors: a failed request becomes a toast and a Try again button. */
  private fetchStations(): Observable<StationsResult> {
    return this.digitraffic.stations().pipe(
      map((stations): StationsResult => ({ stations, failed: false })),
      catchError(() => {
        this.notifications.error(STATIONS_ERROR_TITLE, STATIONS_ERROR_MESSAGE);
        return of<StationsResult>({ stations: [], failed: true });
      }),
    );
  }

  /** Never errors: a failed request becomes a toast and an empty board. */
  private fetchDepartures(code: string): Observable<DeparturesResult> {
    return this.digitraffic.departures(code, this.stationNames()).pipe(
      map((rows): DeparturesResult => ({ rows, updatedAt: new Date() })),
      catchError(() => {
        this.notifications.error(DEPARTURES_ERROR_TITLE, DEPARTURES_ERROR_MESSAGE);
        return of(NO_DEPARTURES);
      }),
    );
  }
}
