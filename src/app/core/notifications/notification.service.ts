import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  readonly id: number;
  readonly kind: ToastKind;
  readonly title: string;
  readonly message: string;
}

/** Non-error toasts hide themselves after this long; errors stay until closed. */
export const TOAST_AUTO_HIDE_MS = 5000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly toastList = signal<readonly Toast[]>([]);
  private nextId = 1;

  readonly toasts = this.toastList.asReadonly();

  success(title: string, message: string): void {
    this.show('success', title, message);
  }

  info(title: string, message: string): void {
    this.show('info', title, message);
  }

  warning(title: string, message: string): void {
    this.show('warning', title, message);
  }

  error(title: string, message: string): void {
    this.show('error', title, message);
  }

  dismiss(id: number): void {
    this.toastList.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private show(kind: ToastKind, title: string, message: string): void {
    const alreadyShowing = this.toastList().some(
      (toast) => toast.kind === kind && toast.title === title && toast.message === message,
    );
    if (alreadyShowing) {
      return;
    }

    const toast: Toast = { id: this.nextId++, kind, title, message };
    this.toastList.update((toasts) => [...toasts, toast]);

    if (kind !== 'error') {
      setTimeout(() => this.dismiss(toast.id), TOAST_AUTO_HIDE_MS);
    }
  }
}
