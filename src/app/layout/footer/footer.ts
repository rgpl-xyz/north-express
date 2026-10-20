import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { APP_NAME } from '../../core/app-info';
import { BUILD_COMMIT, buildLabel } from '../../core/build-commit';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly appName = APP_NAME;
  protected readonly year = new Date().getFullYear();
  /** Which build this is: its commit, linked to GitHub, once deployed. */
  protected readonly build = buildLabel(inject(BUILD_COMMIT));
}
