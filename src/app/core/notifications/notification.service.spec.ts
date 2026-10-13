import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationService, TOAST_AUTO_HIDE_MS } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds toasts in the order they were raised', () => {
    service.info('Heads up', 'First');
    service.error('Oops', 'Second');

    expect(service.toasts()).toEqual([
      { id: expect.any(Number), kind: 'info', title: 'Heads up', message: 'First' },
      { id: expect.any(Number), kind: 'error', title: 'Oops', message: 'Second' },
    ]);
  });

  it('dismisses only the chosen toast', () => {
    service.warning('One', 'a');
    service.success('Two', 'b');
    const [first] = service.toasts();

    service.dismiss(first.id);

    expect(service.toasts().map((toast) => toast.title)).toEqual(['Two']);
  });

  it('hides info, success and warning toasts after a few seconds', () => {
    service.info('Heads up', 'Gone soon');

    vi.advanceTimersByTime(TOAST_AUTO_HIDE_MS - 1);
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(service.toasts()).toEqual([]);
  });

  it('keeps error toasts until they are dismissed', () => {
    service.error('Oops', 'Still here');

    vi.advanceTimersByTime(TOAST_AUTO_HIDE_MS * 10);

    expect(service.toasts()).toHaveLength(1);
  });

  it('does not stack a toast that is already showing', () => {
    service.error('Oops', 'Same problem');
    service.error('Oops', 'Same problem');

    expect(service.toasts()).toHaveLength(1);
  });

  it('shows the toast again once the first one is gone', () => {
    service.error('Oops', 'Same problem');
    service.dismiss(service.toasts()[0].id);

    service.error('Oops', 'Same problem');

    expect(service.toasts()).toHaveLength(1);
  });
});
