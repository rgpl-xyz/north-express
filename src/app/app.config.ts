import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration, withNoIncrementalHydration } from '@angular/platform-browser';
import { TitleStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { digitrafficUserInterceptor } from './core/http/digitraffic-user.interceptor';
import { PageTitleStrategy } from './core/title/page-title.strategy';

// Zoneless change detection is the default since Angular 21, so it needs no provider.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch(), withInterceptors([digitrafficUserInterceptor])),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // Takes over the prerendered home page instead of drawing it again. Without incremental
    // hydration, which this app doesn't use: it puts an inline script in the page, and the
    // site's CSP allows scripts only from its own files.
    provideClientHydration(withNoIncrementalHydration()),
  ],
};
