import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The kinds of transport the app shows departures for. */
export type TransportMode = 'train' | 'bus';

/**
 * A train or a bus seen from the front, as on Finnish station signs, in the current text
 * colour and 1em square: the train by its rounded nose and the rails under it, the bus by
 * its square front, destination strip, mirrors and wheels. Decorative: screen readers skip it, and the words beside it say
 * the same.
 */
@Component({
  selector: 'app-mode-pictogram',
  template: `
    @switch (mode()) {
      @case ('train') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-mode="train">
          <path
            fill-rule="evenodd"
            d="M5 9a7 6 0 0 1 14 0v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3zM8 6.5a1 1 0 0 0-1 1V10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7.5a1 1 0 0 0-1-1zM9 12.8a1.2 1.2 0 1 0 0 2.4a1.2 1.2 0 1 0 0-2.4zM15 12.8a1.2 1.2 0 1 0 0 2.4a1.2 1.2 0 1 0 0-2.4z"
          />
          <path d="M8 17h1.9l-2.5 4.5H5.5zM14.1 17H16l2.5 4.5h-1.9z" />
        </svg>
      }
      @case ('bus') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-mode="bus">
          <path
            fill-rule="evenodd"
            d="M5 2.5h14A1.5 1.5 0 0 1 20.5 4v12.5A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 5 2.5zM6 4h12v1.5H6zM5.75 7a.75.75 0 0 0-.75.75v4.5c0 .41.34.75.75.75h12.5c.41 0 .75-.34.75-.75v-4.5a.75.75 0 0 0-.75-.75zM7 14.5a1 1 0 1 0 0 2a1 1 0 1 0 0-2zM17 14.5a1 1 0 1 0 0 2a1 1 0 1 0 0-2z"
          />
          <path
            d="M5.5 18h3v2.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1zM15.5 18h3v2.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1zM1.5 6.5H3V10H1.5zM21 6.5h1.5V10H21z"
          />
        </svg>
      }
    }
  `,
  styles: `
    :host {
      display: inline-block;
      flex: none;
      width: 1em;
      height: 1em;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      fill: currentColor;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModePictogram {
  readonly mode = input.required<TransportMode>();
}
