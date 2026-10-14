import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import type { Station } from '../../data/departures.models';
import { sizeToFit } from './fit-text';
import { aliasesOf, searchStations } from './station-search';

/**
 * A station search: type part of a name (accents optional) or a station code, then pick
 * from the matches by click, or by the arrow keys and Enter. Angular Aria's combobox and
 * listbox handle the keyboard and the ARIA wiring.
 * Presentational: the caller supplies the stations and the placeholder wording.
 */
@Component({
  selector: 'app-station-picker',
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option],
  templateUrl: './station-picker.html',
  styleUrl: './station-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationPicker {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  // The field's text and whether its list is open live in the combobox, and are read and
  // set there directly. A copy bound both ways can miss a change made and undone between
  // two renders, such as typing then pressing Escape at once.
  private readonly combobox = viewChild(Combobox);
  private readonly listbox = viewChild(Listbox);

  readonly stations = input.required<readonly Station[]>();
  /** Shown in the empty field (for example "Choose a station"). */
  readonly placeholder = input.required<string>();
  /** Short code of the chosen station, or null for none. */
  readonly selected = model<string | null>(null);

  protected readonly aliasesOf = aliasesOf;
  /** Whether the list was last pressed by a finger rather than a mouse or pen. */
  protected pickedByTouch = false;
  protected readonly disabled = computed(() => this.stations().length === 0);

  private readonly chosenName = computed(
    () => this.stations().find((station) => station.code === this.selected())?.name ?? '',
  );
  private readonly text = computed(() => this.combobox()?.value() ?? '');
  private readonly open = computed(() => this.combobox()?.expanded() ?? false);
  /** Every station while the field shows the chosen one; otherwise what the text finds. */
  protected readonly matches = computed(() =>
    this.text() === this.chosenName()
      ? this.stations()
      : searchStations(this.stations(), this.text()),
  );
  protected readonly chosen = computed(() => {
    const code = this.selected();
    return code ? [code] : [];
  });
  protected readonly noMatch = computed(() =>
    this.matches().length === 0 ? `No station matches "${this.text().trim()}".` : '',
  );
  /** The width the field has for its text, kept up to date as the window changes. */
  private readonly room = signal(0);
  /** Counts font loads: text measured before its font arrives is in a fallback font. */
  private readonly fontLoads = signal(0);
  /**
   * The font size at which the field's text just fits it. The stylesheet uses it only when
   * it is smaller than the sign's own size, so a long name shrinks instead of being cut off.
   */
  protected readonly fit = computed(() => {
    this.fontLoads();
    const field = this.field();
    const size = field ? sizeToFit(this.text() || this.placeholder(), field, this.room()) : null;
    return size === null ? null : `${size}px`;
  });

  /** Read out as the list narrows, for people who can't see it. */
  protected readonly announcement = computed(() => {
    if (!this.open() || this.text() === this.chosenName()) {
      return '';
    }
    const count = this.matches().length;
    return this.noMatch() || `${count} ${count === 1 ? 'station' : 'stations'} found.`;
  });

  constructor() {
    // The field shows the chosen station, also when it is chosen from outside.
    effect(() => {
      const name = this.chosenName();
      untracked(() => this.combobox()?.value.set(name));
    });
    afterNextRender(() => this.watchRoom());
    // Keep the highlighted station in view as the arrow keys move through a long list.
    afterRenderEffect(() => {
      const id = this.listbox()?.activeDescendant();
      if (id) {
        this.host.nativeElement.querySelector(`[id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  /** Moves keyboard focus to the field. */
  focus(): void {
    this.field()?.focus();
  }

  protected pick(codes: readonly string[]): void {
    const code = codes[0];
    if (!code) {
      return;
    }
    this.selected.set(code);
    this.show(this.chosenName(), false);
    // On a phone, let the keyboard close so the board can be seen.
    if (this.pickedByTouch) {
      this.field()?.blur();
    }
  }

  /** Closing without a pick (Escape, leaving the field) puts the chosen station back. */
  protected closed(open: boolean): void {
    if (!open) {
      this.combobox()?.value.set(this.chosenName());
    }
  }

  /** Enter with nothing highlighted takes the first match, so "tamp" and Enter is enough. */
  protected enter(): void {
    const first = this.matches()[0];
    if (this.open() && first && !this.field()?.getAttribute('aria-activedescendant')) {
      this.pick([first.code]);
    }
  }

  /** The chevron: the whole list, from the field. */
  protected toggleAll(): void {
    this.show(this.chosenName(), !this.open());
    this.focus();
  }

  /** Measures the field's room now and whenever it changes, such as a phone turned sideways. */
  private watchRoom(): void {
    const field = this.field();
    if (!field || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(([entry]) => this.room.set(entry.contentRect.width));
    observer.observe(field);
    const fonts = document.fonts;
    const measureAgain = () => this.fontLoads.update((count) => count + 1);
    fonts.addEventListener('loadingdone', measureAgain);
    void fonts.ready.then(measureAgain);
    this.destroyRef.onDestroy(() => {
      observer.disconnect();
      fonts.removeEventListener('loadingdone', measureAgain);
    });
  }

  private show(text: string, open: boolean): void {
    this.combobox()?.value.set(text);
    this.combobox()?.expanded.set(open);
  }

  private field(): HTMLInputElement | null {
    return this.host.nativeElement.querySelector('input');
  }
}
