import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
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
});
