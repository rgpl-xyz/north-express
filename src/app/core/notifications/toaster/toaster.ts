import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../notification.service';

@Component({
  selector: 'app-toaster',
  templateUrl: './toaster.html',
  styleUrl: './toaster.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toaster {
  private readonly notifications = inject(NotificationService);

  protected readonly toasts = this.notifications.toasts;

  protected dismiss(id: number): void {
    this.notifications.dismiss(id);
  }
}
