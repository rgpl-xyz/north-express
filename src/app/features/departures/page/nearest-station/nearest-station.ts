import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  InjectionToken,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import type { LatLon } from '../../../../shared/distance';
import type { Station } from '../../data/departures.models';
import { formatDistance, nearestTo } from './nearest';

/** The browser's location service, or null where it has none. Tests provide a fake. */
export const GEOLOCATION = new InjectionToken<Geolocation | null>('GEOLOCATION', {
  factory: () => (typeof navigator === 'undefined' ? null : (navigator.geolocation ?? null)),
});

/** A position a few minutes old is close enough. */
const LOCATE_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 300_000,
  timeout: 10_000,
};

/**
 * The browser's timeout doesn't count the time its permission prompt is open, and a prompt
 * left unanswered never calls back. After this long the button stops waiting.
 */
const GIVE_UP_MS = 20_000;

/** GeolocationPositionError.PERMISSION_DENIED: the user or the browser said no. */
const PERMISSION_DENIED = 1;

const BLOCKED =
  'Location is blocked for this site. Allow it in your browser to find the nearest station.';
const NO_FIX = "Couldn't get your location. Try again, or search for the station.";
const NO_POSITIONS = 'No station has a known location.';

interface Outcome {
  readonly text: string;
  readonly failed: boolean;
}

const NOTHING_YET: Outcome = { text: '', failed: false };

/**
 * The Nearest station button: asks the browser where the user is and picks the closest
 * station. The position is used here only and isn't sent anywhere. `message` says what
 * the last try found, or why it failed, for the page to show and announce; it clears when
 * another station is chosen.
 */
@Component({
  selector: 'app-nearest-station',
  templateUrl: './nearest-station.html',
  styleUrl: './nearest-station.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NearestStation {
  protected readonly geolocation = inject(GEOLOCATION);

  readonly stations = input.required<readonly Station[]>();
  /** The station on the board, so a message about another one can be cleared. */
  readonly selected = input<string | null>(null);
  /** The code of the station found to be nearest. */
  readonly picked = output<string>();

  protected readonly locating = signal(false);
  private readonly outcome = signal<Outcome>(NOTHING_YET);
  /** What the last try found, or why it failed; empty before the first. */
  readonly message = computed(() => this.outcome().text);
  /** Whether that message says something went wrong. */
  readonly failed = computed(() => this.outcome().failed);

  /** Counts tries: an answer for an earlier one, or after the page has gone, is dropped. */
  private attempt = 0;
  private giveUp: ReturnType<typeof setTimeout> | undefined;
  private pickedCode: string | null = null;

  constructor() {
    effect(() => {
      const selected = this.selected();
      untracked(() => {
        if (selected !== this.pickedCode) {
          this.pickedCode = null;
          this.outcome.set(NOTHING_YET);
        }
      });
    });
    inject(DestroyRef).onDestroy(() => this.stopWaiting());
  }

  protected locate(): void {
    if (!this.geolocation || this.locating()) {
      return;
    }
    // Cleared first, so the same outcome twice is announced twice.
    this.outcome.set(NOTHING_YET);
    this.locating.set(true);
    const attempt = ++this.attempt;
    this.giveUp = setTimeout(
      () => this.settle(attempt, { text: NO_FIX, failed: true }),
      GIVE_UP_MS,
    );
    this.geolocation.getCurrentPosition(
      ({ coords }) => this.found(attempt, { lat: coords.latitude, lon: coords.longitude }),
      (error) =>
        this.settle(attempt, {
          text: error.code === PERMISSION_DENIED ? BLOCKED : NO_FIX,
          failed: true,
        }),
      LOCATE_OPTIONS,
    );
  }

  private found(attempt: number, here: LatLon): void {
    const nearest = nearestTo(this.stations(), here);
    if (!nearest) {
      this.settle(attempt, { text: NO_POSITIONS, failed: true });
      return;
    }
    const text = `${nearest.station.name} is ${formatDistance(nearest.km)} from you.`;
    if (this.settle(attempt, { text, failed: false })) {
      this.pickedCode = nearest.station.code;
      this.picked.emit(nearest.station.code);
    }
  }

  /** Ends the try with this outcome, if it is still the current one. */
  private settle(attempt: number, outcome: Outcome): boolean {
    if (attempt !== this.attempt) {
      return false;
    }
    this.stopWaiting();
    this.locating.set(false);
    this.outcome.set(outcome);
    return true;
  }

  private stopWaiting(): void {
    clearTimeout(this.giveUp);
    this.attempt++;
  }
}
