import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { BUILD_COMMIT } from '../../core/build-commit';
import { Footer } from './footer';

describe('Footer', () => {
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Footer] });
    const fixture = TestBed.createComponent(Footer);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const linkNamed = (name: string) =>
    Array.from(element.querySelectorAll('a')).find((link) => link.textContent?.trim() === name);

  it('says the app is a demo by RGPL', () => {
    expect(element.textContent).toContain('The North Express is a demo app by RGPL');
  });

  it('names the build as dev when the build names no commit', () => {
    expect(element.textContent?.replace(/\s+/g, ' ')).toContain('demo app by RGPL · Build dev');
    expect(linkNamed('dev')).toBeUndefined();
  });

  it('credits Fintraffic and the CC BY 4.0 licence', () => {
    const text = element.textContent?.replace(/\s+/g, ' ');

    expect(text).toContain('Train data: Fintraffic / digitraffic.fi, CC BY 4.0');
    expect(linkNamed('Fintraffic / digitraffic.fi')?.getAttribute('href')).toBe(
      'https://www.digitraffic.fi/en/',
    );
    expect(linkNamed('CC BY 4.0')?.getAttribute('href')).toBe(
      'https://creativecommons.org/licenses/by/4.0/',
    );
  });

  it('credits Digitransit with the year, as its terms ask, and the licence', () => {
    const text = element.textContent?.replace(/\s+/g, ' ');
    const credit = `© Digitransit ${new Date().getFullYear()}`;

    expect(text).toContain(`Bus data: ${credit}, CC BY 4.0`);
    expect(linkNamed(credit)?.getAttribute('href')).toBe('https://digitransit.fi/en/');
  });
});

describe('Footer of a deployed build', () => {
  it('links the short commit to it on GitHub', async () => {
    const sha = '0e7c3f5b02f0a1b554fc1bf36a9ac1bea488c967';
    TestBed.configureTestingModule({
      imports: [Footer],
      providers: [{ provide: BUILD_COMMIT, useValue: sha }],
    });
    const fixture = TestBed.createComponent(Footer);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.build');

    expect(link?.textContent?.trim()).toBe('0e7c3f5');
    expect(link?.getAttribute('href')).toBe(
      `https://github.com/rgpl-xyz/north-express/commit/${sha}`,
    );
  });
});
