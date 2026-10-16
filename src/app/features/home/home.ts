import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONTACT_EMAIL, REPOSITORY_URL } from '../../core/app-info';
import { TrackLine } from '../../layout/track-line/track-line';
import { ModePictogram } from '../../shared/mode-pictogram';

@Component({
  selector: 'app-home',
  imports: [RouterLink, TrackLine, ModePictogram],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly repositoryUrl = REPOSITORY_URL;
  protected readonly contactEmail = CONTACT_EMAIL;
}
