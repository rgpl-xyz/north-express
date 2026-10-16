import type { TransportMode } from '../../shared/mode-pictogram';

/** A navbar link. One with `links` is a dropdown toggle that opens them. */
export interface NavigationLink {
  readonly routerLink: string;
  readonly name: string;
  readonly links?: readonly NavigationLink[];
  /** A departures board's mode, shown by its pictogram. */
  readonly mode?: TransportMode;
}

export const NAVIGATION: readonly NavigationLink[] = [
  { routerLink: '/home', name: 'Home' },
  {
    routerLink: '#',
    name: 'Departures',
    links: [
      { routerLink: '/departures/trains', name: 'Trains', mode: 'train' },
      { routerLink: '/departures/buses', name: 'Buses', mode: 'bus' },
    ],
  },
];
