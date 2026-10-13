import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import type { Station } from '../../data/departures.models';

/** A labelled native select: keyboard and screen-reader friendly, with type-ahead. */
@Component({
  selector: 'app-station-picker',
  templateUrl: './station-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationPicker {
  readonly stations = input.required<readonly Station[]>();
  readonly loading = input(false);
  /** Short code of the chosen station, or null for none. */
  readonly selected = model<string | null>(null);

  protected readonly disabled = computed(() => this.loading() || this.stations().length === 0);

  protected readonly placeholder = computed(() => {
    if (this.loading()) {
      return 'Loading stations…';
    }
    return this.stations().length ? 'Choose a station' : 'No stations available';
  });

  protected onChange(event: Event): void {
    const { value } = event.target as HTMLSelectElement;
    this.selected.set(value || null);
  }
}
