import type { Routes } from '@angular/router';

export const DEPARTURES_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'trains' },
  {
    path: 'trains',
    title: 'Trains',
    loadComponent: () => import('./page/departures-page').then((m) => m.DeparturesPage),
  },
];
