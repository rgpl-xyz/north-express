/** Same shape as the old runtime navigationConfig JSON, now a compile-time constant. */
export interface NavigationLink {
  readonly routerLink: string;
  readonly name: string;
  /** Links are hidden unless this is true. */
  readonly show?: boolean;
  readonly links?: readonly NavigationLink[];
}

export const NAVIGATION: readonly NavigationLink[] = [
  { routerLink: '/home', name: 'Home', show: true },
  {
    routerLink: '#',
    name: 'Departures',
    show: true,
    links: [
      { routerLink: '/departures/trains', name: 'Trains', show: true },
      { routerLink: '/departures/buses', name: 'Buses', show: false },
      { routerLink: '/departures/flights', name: 'Flights', show: false },
    ],
  },
  { routerLink: '/about', name: 'About', show: false },
];

/** The links to render: anything not marked `show: true` is dropped, at every level. */
export function visibleLinks(links: readonly NavigationLink[]): NavigationLink[] {
  return links
    .filter((link) => link.show === true)
    .map((link) => (link.links ? { ...link, links: visibleLinks(link.links) } : link));
}
