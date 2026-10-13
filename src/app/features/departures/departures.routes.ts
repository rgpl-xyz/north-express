import type { Routes } from '@angular/router';

export const DEPARTURES_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'trains' },
  {
    path: 'trains',
    title: 'Trains',
    loadComponent: () => import('./trains/trains-page').then((m) => m.TrainsPage),
  },
];
