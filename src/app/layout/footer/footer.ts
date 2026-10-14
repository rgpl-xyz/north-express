import { ChangeDetectionStrategy, Component } from '@angular/core';
import { APP_NAME } from '../../core/app-info';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly appName = APP_NAME;
  protected readonly year = new Date().getFullYear();
}
