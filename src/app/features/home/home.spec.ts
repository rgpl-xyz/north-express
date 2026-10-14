import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Home } from './home';

describe('Home', () => {
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Home], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Home);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const hrefs = () =>
    Array.from(element.querySelectorAll('a')).map((link) => link.getAttribute('href') ?? '');

  it('welcomes the traveller and points to the train and bus departures', () => {
    const welcome = element.querySelector('#welcome');

    expect(welcome?.textContent).toContain('Welcome, traveller');
    expect(welcome?.textContent).toContain('Live train and bus departures in Finland.');
    expect(hrefs()).toContain('/departures/trains');
    expect(hrefs()).toContain('/departures/buses');
  });

  it('points questions and bugs to GitHub and the contact address', () => {
    const help = element.querySelector('#help');

    expect(help?.textContent).toContain('Questions or bugs?');
    expect(hrefs()).toContain('https://github.com/rgpl-xyz/north-express');
    expect(hrefs()).toContain('mailto:contact-us@rgpl.xyz');
  });

  it('has no app-store download card', () => {
    expect(element.querySelector('#card-download-app')).toBeNull();
    expect(element.textContent).not.toContain('Download our app');
    expect(hrefs().filter((href) => /itunes|apple\.com|play\.google|amazon/.test(href))).toEqual(
      [],
    );
  });
});
