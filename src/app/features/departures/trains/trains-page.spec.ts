import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component, ErrorHandler, input } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PASILA_RING_TRAIN_FIXTURE,
  STATIONS_FIXTURE,
  TAMPERE_DEPARTURES_FIXTURE,
} from '../../../../testing/digitraffic-fixtures';
import { NotificationService } from '../../../core/notifications/notification.service';
import type { DepartureRow } from '../data/departures.models';
import { STATIONS_URL, departuresUrl } from '../data/digitraffic.service';
import { DepartureGrid } from './departure-grid/departure-grid';
import { DEPARTURES_ERROR_MESSAGE, STATIONS_ERROR_MESSAGE, TrainsPage } from './trains-page';

/** Stands in for the ag-grid wrapper so these tests stay about the page's behaviour. */
@Component({
  selector: 'app-departure-grid',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class DepartureGridStub {
  readonly rows = input.required<readonly DepartureRow[]>();
  readonly loading = input(false);
}

describe('TrainsPage', () => {
  let fixture: ComponentFixture<TrainsPage>;
  let element: HTMLElement;
  let http: HttpTestingController;
  let notifications: NotificationService;
  const errorHandler = { handleError: vi.fn() };

  const select = () => element.querySelector<HTMLSelectElement>('select')!;
  const statusRegion = () => element.querySelector<HTMLElement>('[role="status"]')!;
  const status = () => statusRegion().textContent?.trim() ?? '';
  const statusIsVisible = () => !statusRegion().classList.contains('visually-hidden');
  const grid = () =>
    fixture.debugElement.query(By.directive(DepartureGridStub))
      .componentInstance as DepartureGridStub;
  const buttonNamed = (name: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === name,
    );
  const refreshButton = () => buttonNamed('Refresh')!;
  const errorMessages = () =>
    notifications
      .toasts()
      .filter((toast) => toast.kind === 'error')
      .map((toast) => toast.message);

  async function chooseStation(code: string): Promise<void> {
    select().value = code;
    select().dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function respondWithStations(): Promise<void> {
    http.expectOne(STATIONS_URL).flush(STATIONS_FIXTURE);
    await fixture.whenStable();
  }

  async function showTampere(): Promise<void> {
    await respondWithStations();
    await chooseStation('TPE');
    http.expectOne(departuresUrl('TPE')).flush(TAMPERE_DEPARTURES_FIXTURE);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    errorHandler.handleError.mockReset();
    TestBed.configureTestingModule({
      imports: [TrainsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ErrorHandler, useValue: errorHandler },
      ],
    }).overrideComponent(TrainsPage, {
      remove: { imports: [DepartureGrid] },
      add: { imports: [DepartureGridStub] },
    });
    http = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
    fixture = TestBed.createComponent(TrainsPage);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    expect(errorHandler.handleError).not.toHaveBeenCalled();
  });

  it('loads passenger stations into the picker', async () => {
    await respondWithStations();

    const options = Array.from(select().options).map((option) => option.text.trim());
    expect(options[0]).toBe('Choose a station');
    expect(options).toContain('Tampere');
    expect(options).not.toContain('Ahonpää');
  });

  it('asks for a station before showing departures', async () => {
    await respondWithStations();

    expect(status()).toBe('Choose a station to see its next departures.');
    expect(statusIsVisible()).toBe(true);
    expect(grid().rows()).toEqual([]);
    expect(refreshButton().disabled).toBe(true);
  });

  it('says that times are in Finland local time', async () => {
    await respondWithStations();

    expect(element.textContent).toContain('Times are Finland local time');
  });

  it('announces that departures are loading', async () => {
    await respondWithStations();

    await chooseStation('TPE');

    expect(status()).toBe('Loading departures from Tampere…');
    expect(statusIsVisible()).toBe(false);
    http.expectOne(departuresUrl('TPE')).flush([]);
  });

  it('shows the departures for the chosen station and announces how many there are', async () => {
    await showTampere();

    expect(
      grid()
        .rows()
        .map((row) => row.train),
    ).toEqual(['Commuter M', 'IC 38', 'IC 25', 'IC 467']);
    expect(grid().rows()[2].destination).toBe('Oulu');
    expect(status()).toBe('4 departures from Tampere.');
    expect(statusIsVisible()).toBe(false);
    expect(element.textContent).toMatch(/Last updated \d{2}:\d{2}:\d{2}/);
  });

  it('uses the singular for a single departure', async () => {
    await respondWithStations();

    await chooseStation('PSL');
    http.expectOne(departuresUrl('PSL')).flush(PASILA_RING_TRAIN_FIXTURE);
    await fixture.whenStable();

    expect(status()).toBe('1 departure from Pasila.');
  });

  it('says so when a station has no upcoming departures', async () => {
    await respondWithStations();

    await chooseStation('TPE');
    http.expectOne(departuresUrl('TPE')).flush([]);
    await fixture.whenStable();

    expect(grid().rows()).toEqual([]);
    expect(status()).toBe('No departures from Tampere in the coming hours.');
    expect(statusIsVisible()).toBe(true);
  });

  it('loads the departures again on refresh', async () => {
    await respondWithStations();
    await chooseStation('TPE');
    http.expectOne(departuresUrl('TPE')).flush([]);
    await fixture.whenStable();

    refreshButton().click();
    await fixture.whenStable();
    http.expectOne(departuresUrl('TPE')).flush(TAMPERE_DEPARTURES_FIXTURE);
    await fixture.whenStable();

    expect(grid().rows()).toHaveLength(4);
  });

  it('drops the answer for a station the user has already moved away from', async () => {
    await respondWithStations();
    await chooseStation('TPE');
    const staleRequest = http.expectOne(departuresUrl('TPE'));

    await chooseStation('PSL');
    http.expectOne(departuresUrl('PSL')).flush(PASILA_RING_TRAIN_FIXTURE);
    await fixture.whenStable();

    expect(staleRequest.cancelled).toBe(true);
    expect(
      grid()
        .rows()
        .map((row) => row.train),
    ).toEqual(['Commuter P']);
    expect(status()).toBe('1 departure from Pasila.');
  });

  it('clears the grid when the placeholder is chosen again', async () => {
    await showTampere();

    await chooseStation('');

    expect(grid().rows()).toEqual([]);
    expect(status()).toBe('Choose a station to see its next departures.');
  });

  describe('when Digitraffic fails', () => {
    it('shows a toast and an empty grid when departures fail to load', async () => {
      await showTampere();

      refreshButton().click();
      await fixture.whenStable();
      http
        .expectOne(departuresUrl('TPE'))
        .flush('Service unavailable', { status: 503, statusText: 'Service Unavailable' });
      await fixture.whenStable();

      expect(DEPARTURES_ERROR_MESSAGE).toBe(
        "Couldn't load departures from Digitraffic. Try again in a moment.",
      );
      expect(errorMessages()).toEqual([DEPARTURES_ERROR_MESSAGE]);
      expect(grid().rows()).toEqual([]);
      expect(status()).toBe("Departures from Tampere couldn't be loaded.");
      expect(statusIsVisible()).toBe(true);
      expect(element.textContent).not.toContain('Last updated');
    });

    it('copes with a network error', async () => {
      await respondWithStations();
      await chooseStation('TPE');

      http.expectOne(departuresUrl('TPE')).error(new ProgressEvent('error'));
      await fixture.whenStable();

      expect(errorMessages()).toEqual([DEPARTURES_ERROR_MESSAGE]);
      expect(grid().rows()).toEqual([]);
    });

    it('keeps working after a failure', async () => {
      await respondWithStations();
      await chooseStation('TPE');
      http.expectOne(departuresUrl('TPE')).error(new ProgressEvent('error'));
      await fixture.whenStable();

      refreshButton().click();
      await fixture.whenStable();
      http.expectOne(departuresUrl('TPE')).flush(TAMPERE_DEPARTURES_FIXTURE);
      await fixture.whenStable();

      expect(grid().rows()).toHaveLength(4);
    });

    it('shows a toast and a Try again button when stations fail to load', async () => {
      http.expectOne(STATIONS_URL).flush('Bad gateway', { status: 502, statusText: 'Bad Gateway' });
      await fixture.whenStable();

      expect(STATIONS_ERROR_MESSAGE).toBe(
        "Couldn't load stations from Digitraffic. Press Try again to reload them.",
      );
      expect(errorMessages()).toEqual([STATIONS_ERROR_MESSAGE]);
      expect(select().options).toHaveLength(1);
      expect(select().disabled).toBe(true);
      expect(grid().rows()).toEqual([]);
      expect(buttonNamed('Try again')).toBeDefined();
    });

    it('reloads the stations from the Try again button', async () => {
      http.expectOne(STATIONS_URL).error(new ProgressEvent('error'));
      await fixture.whenStable();

      buttonNamed('Try again')!.click();
      await fixture.whenStable();
      expect(select().options[0].text.trim()).toBe('Loading stations…');
      http.expectOne(STATIONS_URL).flush(STATIONS_FIXTURE);
      await fixture.whenStable();

      expect(buttonNamed('Try again')).toBeUndefined();
      expect(select().disabled).toBe(false);
      expect(Array.from(select().options).map((option) => option.text.trim())).toContain('Tampere');
    });
  });
});
