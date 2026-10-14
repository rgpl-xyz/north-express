import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONTACT_EMAIL, REPOSITORY_URL } from '../../core/app-info';
import { TrackLine } from '../../layout/track-line/track-line';

@Component({
  selector: 'app-home',
  imports: [RouterLink, TrackLine],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly repositoryUrl = REPOSITORY_URL;
  protected readonly contactEmail = CONTACT_EMAIL;
}
