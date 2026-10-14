import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { routes } from '../../app.routes';
import { NAVIGATION, type NavigationLink } from './navigation';

/** The links a user can follow: dropdown toggles only open their links. */
function destinations(links: readonly NavigationLink[]): NavigationLink[] {
  return links.flatMap((link) => (link.links ? destinations(link.links) : [link]));
}

describe('NAVIGATION', () => {
  it('has Home and a Departures dropdown with Trains and Buses', () => {
    expect(NAVIGATION.map((link) => link.name)).toEqual(['Home', 'Departures']);
    expect(NAVIGATION[1].links?.map((link) => link.name)).toEqual(['Trains', 'Buses']);
  });

  it('only links to pages the app has', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const router = TestBed.inject(Router);

    for (const link of destinations(NAVIGATION)) {
      await router.navigateByUrl(link.routerLink);

      let page = router.routerState.snapshot.root;
      while (page.firstChild) {
        page = page.firstChild;
      }
      expect(page.routeConfig?.path, link.routerLink).not.toBe('**');
    }
  });
});
