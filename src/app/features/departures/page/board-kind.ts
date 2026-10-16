import { InjectionToken } from '@angular/core';
import type { TransportMode } from '../../../shared/mode-pictogram';

/** What sets one departures page apart from another: its mode, heading and column names. */
export interface BoardKind {
  /** Trains or buses, shown by its pictogram next to the heading. */
  readonly mode: TransportMode;
  /** The page's heading, above the station sign, so the board says what it shows. */
  readonly heading: string;
  /** The column for where to board, such as a train's track. */
  readonly place: string;
  /** The same column on a phone, where a long name would be cut off. */
  readonly placeShort: string;
  /** The column naming the service, such as the train. */
  readonly service: string;
}

export const TRAIN_BOARD: BoardKind = {
  mode: 'train',
  heading: 'Train departures',
  place: 'Track',
  placeShort: 'Track',
  service: 'Train',
};

export const BUS_BOARD: BoardKind = {
  mode: 'bus',
  heading: 'Bus departures',
  place: 'Platform',
  // As UK station boards shorten it.
  placeShort: 'Plat',
  service: 'Bus',
};

/** Set per route, next to the route's DepartureSource. A page without one shows trains. */
export const BOARD_KIND = new InjectionToken<BoardKind>('BOARD_KIND', {
  factory: () => TRAIN_BOARD,
});
