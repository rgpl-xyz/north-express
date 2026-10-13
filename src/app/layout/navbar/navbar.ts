import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { APP_NAME } from '../../core/app-info';
import { NAVIGATION, type NavigationLink, visibleLinks } from '../../core/navigation/navigation';

/**
 * Bootstrap navbar driven by signals instead of Bootstrap's JavaScript: the toggler
 * opens the collapsed menu, dropdown buttons open their menus, Escape closes the
 * innermost open thing and returns focus to the button that opened it.
 */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class Navbar {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly appName = APP_NAME;
  protected readonly links = visibleLinks(NAVIGATION);
  protected readonly menuOpen = signal(false);
  protected readonly openDropdown = signal<string | null>(null);

  constructor() {
    // Covers navigation from outside the navbar (back button, links on the page).
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMenus());
  }

  /** Also bound to every navbar link: a link to the current page fires no NavigationEnd. */
  protected closeMenus(): void {
    this.menuOpen.set(false);
    this.openDropdown.set(null);
  }

  protected toggleId(link: NavigationLink): string {
    return `nav-${this.slug(link)}-toggle`;
  }

  protected menuId(link: NavigationLink): string {
    return `nav-${this.slug(link)}-menu`;
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected toggleDropdown(link: NavigationLink): void {
    this.openDropdown.update((open) => (open === link.name ? null : link.name));
  }

  protected onEscape(): void {
    const dropdown = this.openDropdown();
    if (dropdown) {
      this.openDropdown.set(null);
      this.focus(`#${this.toggleId({ name: dropdown, routerLink: '#' })}`);
    } else if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.focus('.navbar-toggler');
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node | null)) {
      this.openDropdown.set(null);
    }
  }

  private slug(link: NavigationLink): string {
    return link.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  private focus(selector: string): void {
    this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
  }
}
