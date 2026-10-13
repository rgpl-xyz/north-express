import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_NAME, CONTACT_EMAIL, REPOSITORY_URL } from '../../core/app-info';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly appName = APP_NAME;
  protected readonly repositoryUrl = REPOSITORY_URL;
  protected readonly contactEmail = CONTACT_EMAIL;
}
