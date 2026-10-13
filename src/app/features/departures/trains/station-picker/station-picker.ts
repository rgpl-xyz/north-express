import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
} from '@angular/core';
import type { Station } from '../../data/departures.models';

/**
 * A labelled native select: keyboard and screen-reader friendly, with type-ahead.
 * Presentational: the caller supplies the stations and the placeholder wording.
 */
@Component({
  selector: 'app-station-picker',
  templateUrl: './station-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationPicker {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly stations = input.required<readonly Station[]>();
  /** First option, shown when no station is chosen (for example "Choose a station"). */
  readonly placeholder = input.required<string>();
  /** Short code of the chosen station, or null for none. */
  readonly selected = model<string | null>(null);

  protected readonly disabled = computed(() => this.stations().length === 0);

  /** Moves keyboard focus to the select. */
  focus(): void {
    this.host.nativeElement.querySelector('select')?.focus();
  }

  protected onChange(event: Event): void {
    const { value } = event.target as HTMLSelectElement;
    this.selected.set(value || null);
  }
}
