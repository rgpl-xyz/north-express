import { InjectionToken } from '@angular/core';

/** What sets one departures page apart from another: its heading and two column names. */
export interface BoardKind {
  /** The page's heading, for screen readers; on screen the station picker is the sign. */
  readonly heading: string;
  /** The column for where to board, such as a train's track. */
  readonly place: string;
  /** The column naming the service, such as the train. */
  readonly service: string;
}

export const TRAIN_BOARD: BoardKind = {
  heading: 'Train departures',
  place: 'Track',
  service: 'Train',
};

/** Set per route, next to the route's DepartureSource. A page without one shows trains. */
export const BOARD_KIND = new InjectionToken<BoardKind>('BOARD_KIND', {
  factory: () => TRAIN_BOARD,
});
