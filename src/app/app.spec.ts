import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { routes } from './app.routes';
import { PageTitleStrategy } from './core/title/page-title.strategy';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), { provide: TitleStrategy, useClass: PageTitleStrategy }],
    });
  });

  it('renders the shell: navbar, main content, footer and toaster', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-navbar')).not.toBeNull();
    expect(element.querySelector('main router-outlet')).not.toBeNull();
    expect(element.querySelector('app-footer')).not.toBeNull();
    expect(element.querySelector('app-toaster')).not.toBeNull();
  });

  it('sends the empty path to the home page', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/home');
    expect(harness.routeNativeElement?.textContent).toContain('Welcome, traveller');
    expect(TestBed.inject(Title).getTitle()).toBe('Home | The North Express');
  });

  it('shows the not-found page for unknown paths', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/no/such/page');

    expect(harness.routeNativeElement?.textContent).toContain('Page not found');
    expect(TestBed.inject(Title).getTitle()).toBe('Page not found | The North Express');
  });
});
