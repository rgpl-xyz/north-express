import { type ErrorHandler, Injectable, inject } from '@angular/core';
import { NotificationService } from '../notifications/notification.service';

export const UNEXPECTED_ERROR_TITLE = 'Something went wrong';
export const UNEXPECTED_ERROR_MESSAGE = 'Please try again. If it keeps happening, reload the page.';

/**
 * Last line of defence for errors nothing else caught. It makes no assumptions about
 * the error's shape: it logs the error for developers and shows a friendly toast.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notifications = inject(NotificationService);

  handleError(error: unknown): void {
    console.error(error);
    try {
      this.notifications.error(UNEXPECTED_ERROR_TITLE, UNEXPECTED_ERROR_MESSAGE);
    } catch (toastError) {
      console.error('Could not show the error notification', toastError);
    }
  }
}
