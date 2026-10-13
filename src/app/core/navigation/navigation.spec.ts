import { describe, expect, it } from 'vitest';
import { NAVIGATION, type NavigationLink, visibleLinks } from './navigation';

describe('visibleLinks', () => {
  it('hides links marked show: false, including nested ones', () => {
    const links: readonly NavigationLink[] = [
      { routerLink: '/a', name: 'A', show: true },
      { routerLink: '/b', name: 'B', show: false },
      {
        routerLink: '#',
        name: 'Group',
        show: true,
        links: [
          { routerLink: '/c', name: 'C', show: true },
          { routerLink: '/d', name: 'D', show: false },
        ],
      },
    ];

    expect(visibleLinks(links)).toEqual([
      { routerLink: '/a', name: 'A', show: true },
      {
        routerLink: '#',
        name: 'Group',
        show: true,
        links: [{ routerLink: '/c', name: 'C', show: true }],
      },
    ]);
  });

  it('treats links without a show flag as hidden, like the old config', () => {
    expect(visibleLinks([{ routerLink: '/a', name: 'A' }])).toEqual([]);
  });

  it('shows Home and Departures > Trains from the app navigation', () => {
    const visible = visibleLinks(NAVIGATION);

    expect(visible.map((link) => link.name)).toEqual(['Home', 'Departures']);
    expect(visible[1].links?.map((link) => link.name)).toEqual(['Trains']);
  });

  it('keeps the hidden Buses, Flights and About entries in the config', () => {
    const departures = NAVIGATION.find((link) => link.name === 'Departures');

    expect(departures?.links?.map((link) => [link.name, link.show])).toEqual([
      ['Trains', true],
      ['Buses', false],
      ['Flights', false],
    ]);
    expect(NAVIGATION.find((link) => link.name === 'About')?.show).toBe(false);
  });
});
