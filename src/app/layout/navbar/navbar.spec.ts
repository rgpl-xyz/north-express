import { ChangeDetectionStrategy, Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Navbar } from './navbar';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class BlankPage {}

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let element: HTMLElement;

  const menuToggle = () => element.querySelector<HTMLButtonElement>('button.navbar-toggler')!;
  const collapse = () => element.querySelector<HTMLElement>('#main-navigation')!;
  const departuresToggle = () =>
    element.querySelector<HTMLButtonElement>('#nav-departures-toggle')!;
  const departuresMenu = () => element.querySelector<HTMLElement>('#nav-departures-menu')!;
  const trainsLink = () =>
    element.querySelector<HTMLAnchorElement>('#nav-departures-menu a[href="/departures/trains"]')!;

  async function pressEscape(): Promise<void> {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
  }

  async function openMenuAndDropdown(): Promise<void> {
    menuToggle().click();
    await fixture.whenStable();
    departuresToggle().click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([
          { path: 'home', component: BlankPage },
          { path: 'departures/trains', component: BlankPage },
        ]),
      ],
    });
    fixture = TestBed.createComponent(Navbar);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('shows the app name as the brand, linking home', () => {
    const brand = element.querySelector<HTMLAnchorElement>('a.navbar-brand')!;

    expect(brand.textContent?.trim()).toBe('The North Express');
    expect(brand.getAttribute('href')).toBe('/');
  });

  it('renders Home and the Departures dropdown with Trains', () => {
    const text = element.textContent ?? '';
    const hrefs = Array.from(element.querySelectorAll('a')).map((link) =>
      link.getAttribute('href'),
    );

    expect(text).toContain('Home');
    expect(text).toContain('Departures');
    expect(text).toContain('Trains');
    expect(hrefs).toEqual(['/', '/home', '/departures/trains']);
  });

  it('opens and closes the collapsed menu with the toggler', async () => {
    expect(menuToggle().getAttribute('aria-expanded')).toBe('false');
    expect(collapse().classList).not.toContain('show');

    menuToggle().click();
    await fixture.whenStable();

    expect(menuToggle().getAttribute('aria-expanded')).toBe('true');
    expect(collapse().classList).toContain('show');

    menuToggle().click();
    await fixture.whenStable();

    expect(collapse().classList).not.toContain('show');
  });

  it('opens the Departures dropdown from its button', async () => {
    expect(departuresToggle().tagName).toBe('BUTTON');
    expect(departuresToggle().getAttribute('aria-expanded')).toBe('false');

    departuresToggle().click();
    await fixture.whenStable();

    expect(departuresToggle().getAttribute('aria-expanded')).toBe('true');
    expect(departuresMenu().classList).toContain('show');
  });

  it('closes the dropdown with Escape and puts focus back on its button', async () => {
    departuresToggle().click();
    await fixture.whenStable();

    await pressEscape();

    expect(departuresMenu().classList).not.toContain('show');
    expect(document.activeElement).toBe(departuresToggle());
  });

  it('closes the collapsed menu with Escape once the dropdown is closed', async () => {
    menuToggle().click();
    await fixture.whenStable();

    await pressEscape();

    expect(collapse().classList).not.toContain('show');
    expect(document.activeElement).toBe(menuToggle());
  });

  it('closes the dropdown when clicking elsewhere on the page', async () => {
    departuresToggle().click();
    await fixture.whenStable();

    document.body.click();
    await fixture.whenStable();

    expect(departuresMenu().classList).not.toContain('show');
  });

  it('closes the menu and dropdown when a link is clicked', async () => {
    await openMenuAndDropdown();

    trainsLink().click();
    await fixture.whenStable();

    expect(collapse().classList).not.toContain('show');
    expect(departuresMenu().classList).not.toContain('show');
  });

  it('closes them even for a link to the page that is already open', async () => {
    await TestBed.inject(Router).navigateByUrl('/departures/trains');
    await fixture.whenStable();
    await openMenuAndDropdown();

    // Same URL: the router skips the navigation, so no NavigationEnd closes anything.
    trainsLink().click();
    await fixture.whenStable();

    expect(collapse().classList).not.toContain('show');
    expect(departuresMenu().classList).not.toContain('show');
    expect(menuToggle().getAttribute('aria-expanded')).toBe('false');
  });
});
