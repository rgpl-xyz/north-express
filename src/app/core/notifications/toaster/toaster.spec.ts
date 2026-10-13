import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { NotificationService } from '../notification.service';
import { Toaster } from './toaster';

describe('Toaster', () => {
  let fixture: ComponentFixture<Toaster>;
  let element: HTMLElement;
  let notifications: NotificationService;

  const toasts = () => Array.from(element.querySelectorAll<HTMLElement>('.toast'));

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Toaster] });
    fixture = TestBed.createComponent(Toaster);
    element = fixture.nativeElement as HTMLElement;
    notifications = TestBed.inject(NotificationService);
    await fixture.whenStable();
  });

  it('renders nothing when there are no notifications', () => {
    expect(toasts()).toEqual([]);
  });

  it('renders each notification with its title and message', async () => {
    notifications.error('Departures unavailable', 'Try again in a moment.');
    notifications.info('Heads up', 'Just so you know.');
    await fixture.whenStable();

    // Title and message are separate blocks; Angular strips the whitespace
    // between elements, so compare each part rather than the joined text.
    expect(
      toasts().map((toast) => [
        toast.querySelector('.toast-header strong')?.textContent?.trim(),
        toast.querySelector('.toast-body')?.textContent?.trim(),
      ]),
    ).toEqual([
      ['Departures unavailable', 'Try again in a moment.'],
      ['Heads up', 'Just so you know.'],
    ]);
  });

  it('announces errors as alerts and other toasts as status messages', async () => {
    notifications.error('Oops', 'Broken');
    notifications.success('Done', 'Fine');
    await fixture.whenStable();

    expect(toasts().map((toast) => toast.getAttribute('role'))).toEqual(['alert', 'status']);
    expect(toasts()[0].classList).toContain('toast-error');
  });

  it('closes a toast with its close button', async () => {
    notifications.error('Oops', 'Broken');
    await fixture.whenStable();

    toasts()[0].querySelector<HTMLButtonElement>('button.btn-close')!.click();
    await fixture.whenStable();

    expect(toasts()).toEqual([]);
    expect(notifications.toasts()).toEqual([]);
  });
});
