import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PageTitleStrategy } from './page-title.strategy';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class BlankPage {}

describe('PageTitleStrategy', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'departures',
            title: 'Departures',
            children: [{ path: 'trains', title: 'Trains', component: BlankPage }],
          },
          { path: 'untitled', component: BlankPage },
        ]),
        { provide: TitleStrategy, useClass: PageTitleStrategy },
      ],
    });
  });

  it('adds the app name after the route title', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/departures/trains');

    expect(TestBed.inject(Title).getTitle()).toBe('Trains | The North Express');
  });

  it('uses the app name alone when the route has no title', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/untitled');

    expect(TestBed.inject(Title).getTitle()).toBe('The North Express');
  });
});
