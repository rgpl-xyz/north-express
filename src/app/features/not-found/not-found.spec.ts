import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { NotFound } from './not-found';

describe('NotFound', () => {
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [NotFound], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NotFound);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('says the page was not found', () => {
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Page not found');
  });

  it('offers a way back home', () => {
    const link = Array.from(element.querySelectorAll('a')).find((candidate) =>
      candidate.textContent?.includes('Take me home'),
    );

    expect(link?.getAttribute('href')).toBe('/');
  });
});
