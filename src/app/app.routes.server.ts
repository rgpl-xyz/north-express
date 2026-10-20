import { RenderMode, type ServerRoute } from '@angular/ssr';

/**
 * Which pages the build renders ahead of time. The home page is the same for everyone, so
 * its text is in the HTML for crawlers that don't run scripts. The boards show live data
 * and stay in the browser.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'home', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
