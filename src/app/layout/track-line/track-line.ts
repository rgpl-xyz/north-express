import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface Point {
  readonly x: number;
  readonly y: number;
}

/** A stop drawn on the line, with the side of its dot its name goes on. */
export interface DrawnStop extends Point {
  readonly name: string;
  readonly side: 'below' | 'right' | 'above';
  readonly terminus: boolean;
}

/**
 * How the line ends: running off both edges of the drawing, starting and stopping at
 * its first and last stations, or stopping at a buffer after the last one.
 */
export type LineEnds = 'open' | 'stations' | 'buffer';

/** Stations on the main line from Helsinki to Tampere, in order. */
export const MAIN_LINE: readonly string[] = [
  'Helsinki',
  'Pasila',
  'Tikkurila',
  'Kerava',
  'Riihimäki',
  'Hämeenlinna',
  'Tampere',
];

// The line in viewBox units, drawn like a route map: along the bottom, up at
// 45 degrees, then along the top to the right edge or to a buffer stop.
const LOW_START: Point = { x: 0, y: 200 };
const LOW_BEND: Point = { x: 250, y: 200 };
const HIGH_BEND: Point = { x: 390, y: 60 };
const OPEN_END_X = 640;
const BUFFER_END_X = 560;
/** How far the first and last stops sit from the line's ends. */
const END_MARGIN = 40;

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Spreads the stops evenly along the line ending at endX, first stop at the start. */
export function placeStops(names: readonly string[], endX: number): DrawnStop[] {
  const corners = [LOW_START, LOW_BEND, HIGH_BEND, { x: endX, y: HIGH_BEND.y }];
  const sides = ['below', 'right', 'above'] as const;
  const lengths = corners.slice(1).map((corner, i) => distance(corners[i], corner));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const step = names.length > 1 ? (total - 2 * END_MARGIN) / (names.length - 1) : 0;

  return names.map((name, index) => {
    let along = names.length > 1 ? END_MARGIN + index * step : total / 2;
    let segment = 0;
    while (segment < lengths.length - 1 && along > lengths[segment]) {
      along -= lengths[segment];
      segment += 1;
    }
    const from = corners[segment];
    const to = corners[segment + 1];
    const share = along / lengths[segment];
    return {
      name,
      x: from.x + (to.x - from.x) * share,
      y: from.y + (to.y - from.y) * share,
      side: sides[segment],
      terminus: index === 0 || index === names.length - 1,
    };
  });
}

/**
 * A stretch of railway drawn like a route map, with a dot and a name for each stop:
 * by default the main line from Helsinki to Tampere. Decoration only: hidden from
 * assistive technology, and it takes its colour from the text around it.
 */
@Component({
  selector: 'app-track-line',
  template: `
    <svg [attr.viewBox]="viewBox()" preserveAspectRatio="xMaxYMid meet" focusable="false">
      <path class="rail" [attr.d]="rail()" />
      @if (ends() === 'buffer') {
        <path class="buffer" [attr.d]="'M' + lastX() + ' 32V88'" />
      }
      @for (stop of placed(); track $index) {
        <circle
          class="stop"
          [class.terminus]="stop.terminus"
          [attr.cx]="stop.x"
          [attr.cy]="stop.y"
          [attr.r]="stop.terminus ? 9 : 6"
        />
        @if (named()) {
          <text
            class="name"
            [attr.x]="stop.side === 'right' ? stop.x + 16 : stop.x"
            [attr.y]="
              stop.side === 'below' ? stop.y + 32 : stop.side === 'above' ? stop.y - 22 : stop.y + 6
            "
            [attr.text-anchor]="stop.side === 'right' ? 'start' : 'middle'"
          >
            {{ stop.name }}
          </text>
        }
      }
    </svg>
  `,
  styleUrl: './track-line.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[class.road]': 'road()' },
})
export class TrackLine {
  /** Station names from the start of the line; with none, the line is drawn alone. */
  readonly stops = input<readonly string[]>(MAIN_LINE);
  /** Whether the stops are named, or drawn as dots only. */
  readonly named = input(true);
  /** Draws the line dashed, like a road's centre line, for a bus board. */
  readonly road = input(false);
  readonly ends = input<LineEnds>('open');

  protected readonly placed = computed(() =>
    placeStops(this.stops(), this.ends() === 'buffer' ? BUFFER_END_X : OPEN_END_X),
  );
  protected readonly firstX = computed(() =>
    this.ends() === 'open' ? LOW_START.x : Math.round(this.placed()[0]?.x ?? LOW_START.x),
  );
  protected readonly lastX = computed(() => {
    switch (this.ends()) {
      case 'open':
        return OPEN_END_X;
      case 'buffer':
        return BUFFER_END_X;
      case 'stations':
        return Math.round(this.placed().at(-1)?.x ?? OPEN_END_X);
    }
  });
  protected readonly rail = computed(
    () =>
      `M${this.firstX()} ${LOW_START.y}H${LOW_BEND.x}L${HIGH_BEND.x} ${HIGH_BEND.y}H${this.lastX()}`,
  );
  /** Without names the drawing needs no room above or below the line. */
  protected readonly viewBox = computed(() =>
    this.named() ? `0 0 ${OPEN_END_X} 240` : `0 24 ${OPEN_END_X} 192`,
  );
}
