import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { NotificationService } from '../notifications/notification.service';
import {
  GlobalErrorHandler,
  UNEXPECTED_ERROR_MESSAGE,
  UNEXPECTED_ERROR_TITLE,
} from './global-error-handler';

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;
  let notifications: NotificationService;
  let consoleError: MockInstance<typeof console.error>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GlobalErrorHandler] });
    handler = TestBed.inject(GlobalErrorHandler);
    notifications = TestBed.inject(NotificationService);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the error and shows a friendly toast', () => {
    const error = new Error('boom');

    handler.handleError(error);

    expect(consoleError).toHaveBeenCalledWith(error);
    expect(notifications.toasts()).toEqual([
      {
        id: expect.any(Number),
        kind: 'error',
        title: UNEXPECTED_ERROR_TITLE,
        message: UNEXPECTED_ERROR_MESSAGE,
      },
    ]);
  });

  it.each([
    ['an HTTP error without the old NS error shape', new HttpErrorResponse({ status: 500 })],
    ['an HTTP error with an empty errors list', new HttpErrorResponse({ error: { errors: [] } })],
    ['a plain string', 'something broke'],
    ['null', null],
    ['undefined', undefined],
  ])('copes with %s', (_label, error) => {
    expect(() => handler.handleError(error)).not.toThrow();
    expect(notifications.toasts()).toHaveLength(1);
  });

  describe('a window error event', () => {
    // As Angular passes one on: an Error with the event as its cause.
    const fromWindow = (message: string) =>
      new Error(message, { cause: new ErrorEvent('error', { message }) });

    it('takes ResizeObserver’s loop notice, which is not an error, without a toast', () => {
      const consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
      const notice = fromWindow('ResizeObserver loop completed with undelivered notifications.');

      handler.handleError(notice);

      expect(notifications.toasts()).toEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleDebug).toHaveBeenCalledWith(notice);
    });

    it('shows the toast for any other', () => {
      handler.handleError(fromWindow('Script error.'));

      expect(notifications.toasts()).toHaveLength(1);
    });
  });

  it('does not throw when the toast cannot be shown', () => {
    vi.spyOn(notifications, 'error').mockImplementation(() => {
      throw new Error('toast failed');
    });

    expect(() => handler.handleError(new Error('boom'))).not.toThrow();
  });
});
