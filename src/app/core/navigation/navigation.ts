/** A navbar link. One with `links` is a dropdown toggle that opens them. */
export interface NavigationLink {
  readonly routerLink: string;
  readonly name: string;
  readonly links?: readonly NavigationLink[];
}

export const NAVIGATION: readonly NavigationLink[] = [
  { routerLink: '/home', name: 'Home' },
  {
    routerLink: '#',
    name: 'Departures',
    links: [{ routerLink: '/departures/trains', name: 'Trains' }],
  },
];
