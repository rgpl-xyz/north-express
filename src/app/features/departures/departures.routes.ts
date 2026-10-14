import type { Routes } from '@angular/router';
import { DepartureSource } from './data/departure-source';
import { DigitransitBusSource } from './data/digitransit-bus-source';
import { BOARD_KIND, BUS_BOARD } from './page/board-kind';

export const DEPARTURES_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'trains' },
  {
    path: 'trains',
    title: 'Trains',
    loadComponent: () => import('./page/departures-page').then((m) => m.DeparturesPage),
  },
  {
    // The same page over Digitransit. The route's injector keeps one source while the app
    // is open, so the bus stations load once, like the train stations.
    path: 'buses',
    title: 'Buses',
    loadComponent: () => import('./page/departures-page').then((m) => m.DeparturesPage),
    providers: [
      { provide: DepartureSource, useClass: DigitransitBusSource },
      { provide: BOARD_KIND, useValue: BUS_BOARD },
    ],
  },
];
