import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrackLine } from '../../layout/track-line/track-line';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, TrackLine],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}
