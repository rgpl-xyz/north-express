import { type ErrorHandler, Injectable, inject } from '@angular/core';
import { NotificationService } from '../notifications/notification.service';

export const UNEXPECTED_ERROR_TITLE = 'Something went wrong';
export const UNEXPECTED_ERROR_MESSAGE = 'Please try again. If it keeps happening, reload the page.';

/**
 * The browser's notice that a ResizeObserver had more to report than one frame allowed.
 * It reports the rest in the next frame, so nothing is broken. In Safari's engine, ag-grid's
 * own observers raise it when a board switches to its phone layout. It comes as a window
 * error event, which Angular passes on as an Error with the event as its cause.
 */
function isResizeObserverNotice(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  return cause instanceof ErrorEvent && cause.message.startsWith('ResizeObserver loop');
}

/**
 * Last line of defence for errors nothing else caught. It makes no assumptions about
 * the error's shape: it logs the error for developers and shows a friendly toast.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notifications = inject(NotificationService);

  handleError(error: unknown): void {
    if (isResizeObserverNotice(error)) {
      console.debug(error);
      return;
    }
    console.error(error);
    try {
      this.notifications.error(UNEXPECTED_ERROR_TITLE, UNEXPECTED_ERROR_MESSAGE);
    } catch (toastError) {
      console.error('Could not show the error notification', toastError);
    }
  }
}
