import { ChangeDetectionStrategy, Component, ErrorHandler, input } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  InMemoryDepartureSource,
  TEST_STATIONS,
  departureRow,
} from '../../../../testing/in-memory-departure-source';
import { DepartureSource } from '../data/departure-source';
import type { DepartureRow } from '../data/departures.models';
import { DepartureGrid } from './departure-grid/departure-grid';
import { TrainsPage } from './trains-page';

/** Stands in for the ag-grid wrapper so these tests stay about what the page renders. */
@Component({
  selector: 'app-departure-grid',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class DepartureGridStub {
  readonly rows = input.required<readonly DepartureRow[]>();
  readonly loading = input(false);
}

const ROWS = [departureRow({ id: 'a' }), departureRow({ id: 'b', train: 'IC 38' })];

describe('TrainsPage', () => {
  let fixture: ComponentFixture<TrainsPage>;
  let element: HTMLElement;
  let source: InMemoryDepartureSource;
  const errorHandler = { handleError: vi.fn() };

  const select = () => element.querySelector<HTMLSelectElement>('select')!;
  const optionTexts = () => Array.from(select().options).map((option) => option.text.trim());
  const liveRegion = () => element.querySelector<HTMLElement>('[role="status"]')!;
  const alertBox = () => element.querySelector<HTMLElement>('.alert');
  const grid = () =>
    fixture.debugElement.query(By.directive(DepartureGridStub))
      .componentInstance as DepartureGridStub;
  const button = (name: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === name,
    );

  async function settle(): Promise<void> {
    await fixture.whenStable();
  }

  async function chooseStation(code: string): Promise<void> {
    select().value = code;
    select().dispatchEvent(new Event('change'));
    await settle();
  }

  async function showTampere(): Promise<void> {
    source.latestStations().resolve(TEST_STATIONS);
    await settle();
    await chooseStation('TPE');
    source.latestDepartures('TPE').resolve(ROWS);
    await settle();
  }

  beforeEach(async () => {
    errorHandler.handleError.mockReset();
    source = new InMemoryDepartureSource();
    TestBed.configureTestingModule({
      imports: [TrainsPage],
      providers: [
        { provide: DepartureSource, useValue: source },
        { provide: ErrorHandler, useValue: errorHandler },
      ],
    }).overrideComponent(TrainsPage, {
      remove: { imports: [DepartureGrid] },
      add: { imports: [DepartureGridStub] },
    });
    fixture = TestBed.createComponent(TrainsPage);
    element = fixture.nativeElement as HTMLElement;
    await settle();
  });

  afterEach(() => {
    expect(errorHandler.handleError).not.toHaveBeenCalled();
  });

  it('fills the picker from the stations state', async () => {
    expect(optionTexts()).toEqual(['Loading stations…']);
    expect(select().disabled).toBe(true);

    source.latestStations().resolve(TEST_STATIONS);
    await settle();

    expect(optionTexts()).toEqual(['Choose a station', 'Helsinki', 'Pasila', 'Tampere']);
    expect(select().disabled).toBe(false);
  });

  it('says that times are in Finland local time', () => {
    expect(element.textContent).toContain('Times are Finland local time');
  });

  it('puts the board status in the live region, hidden when the grid already says it', async () => {
    source.latestStations().resolve(TEST_STATIONS);
    await settle();

    expect(liveRegion().textContent?.trim()).toBe('Choose a station to see its next departures.');
    expect(liveRegion().classList).not.toContain('visually-hidden');

    await chooseStation('TPE');
    expect(liveRegion().textContent?.trim()).toBe('Loading departures from Tampere…');
    expect(liveRegion().classList).toContain('visually-hidden');

    source.latestDepartures('TPE').resolve(ROWS);
    await settle();
    expect(liveRegion().textContent?.trim()).toBe('2 departures from Tampere.');
  });

  it('asks the board for departures when a station is chosen and passes them to the grid', async () => {
    source.latestStations().resolve(TEST_STATIONS);
    await settle();

    await chooseStation('TPE');

    expect(source.departuresCalls.map((call) => call.stationCode)).toEqual(['TPE']);
    expect(grid().loading()).toBe(true);
    expect(grid().rows()).toEqual([]);

    source.latestDepartures('TPE').resolve(ROWS);
    await settle();

    expect(grid().loading()).toBe(false);
    expect(grid().rows()).toEqual(ROWS);
    expect(select().value).toBe('TPE');
    expect(element.textContent).toMatch(/Last updated \d{2}:\d{2}:\d{2}\./);
  });

  it('enables Refresh only when there is something to refresh', async () => {
    source.latestStations().resolve(TEST_STATIONS);
    await settle();
    expect(button('Refresh')!.disabled).toBe(true);

    await chooseStation('TPE');
    expect(button('Refresh')!.disabled).toBe(true);

    source.latestDepartures('TPE').resolve(ROWS);
    await settle();
    expect(button('Refresh')!.disabled).toBe(false);

    button('Refresh')!.click();
    await settle();
    expect(source.departuresCalls).toHaveLength(2);
  });

  it('shows no alert while everything loads', async () => {
    await showTampere();

    expect(alertBox()).toBeNull();
    expect(button('Try again')).toBeUndefined();
  });

  describe('Try again', () => {
    /** Focuses Try again and presses it, as a keyboard user would. */
    async function pressTryAgain(): Promise<HTMLButtonElement> {
      const tryAgain = button('Try again')!;
      tryAgain.focus();
      tryAgain.click();
      await settle();
      return tryAgain;
    }

    async function staleTampere(): Promise<void> {
      await showTampere();
      button('Refresh')!.click();
      await settle();
      source.latestDepartures('TPE').fail();
      await settle();
    }

    async function failedTampere(): Promise<void> {
      source.latestStations().resolve(TEST_STATIONS);
      await settle();
      await chooseStation('TPE');
      source.latestDepartures('TPE').fail();
      await settle();
    }

    it('shows the stations failure inline and retries the stations', async () => {
      source.latestStations().fail();
      await settle();

      expect(alertBox()?.textContent).toContain("Couldn't load stations.");
      expect(optionTexts()).toEqual(["Couldn't load stations."]);

      await pressTryAgain();

      expect(source.stationsCalls).toHaveLength(2);
    });

    it('stays in place, busy and still focused, while the retry runs', async () => {
      source.latestStations().fail();
      await settle();

      const pressed = await pressTryAgain();

      expect(alertBox()?.textContent).toContain("Couldn't load stations.");
      const busy = button('Trying again…')!;
      expect(busy).toBe(pressed);
      expect(busy.getAttribute('aria-disabled')).toBe('true');
      expect(busy.hasAttribute('disabled')).toBe(false);
      expect(document.activeElement).toBe(busy);
    });

    it('ignores presses while the retry runs', async () => {
      source.latestStations().fail();
      await settle();
      await pressTryAgain();

      button('Trying again…')!.click();
      await settle();

      expect(source.stationsCalls).toHaveLength(2);
    });

    it('moves focus to the station picker once the stations load', async () => {
      source.latestStations().fail();
      await settle();
      await pressTryAgain();

      source.latestStations().resolve(TEST_STATIONS);
      await settle();

      expect(alertBox()).toBeNull();
      expect(document.activeElement).toBe(select());
    });

    it('keeps focus on Try again when the retry fails too', async () => {
      source.latestStations().fail();
      await settle();
      const pressed = await pressTryAgain();

      source.latestStations().fail();
      await settle();

      expect(button('Try again')).toBe(pressed);
      expect(pressed.hasAttribute('aria-disabled')).toBe(false);
      expect(document.activeElement).toBe(pressed);
    });

    it('keeps stale rows, their time and the alert while refreshing them', async () => {
      await staleTampere();

      expect(alertBox()?.textContent).toMatch(
        /Couldn't refresh\. Showing departures from \d{2}:\d{2}\./,
      );
      expect(grid().rows()).toEqual(ROWS);

      await pressTryAgain();

      expect(source.departuresCalls).toHaveLength(3);
      expect(alertBox()?.textContent).toMatch(/Couldn't refresh\./);
      expect(button('Trying again…')).toBeDefined();
      expect(element.textContent).toMatch(/Last updated \d{2}:\d{2}:\d{2}\./);
      expect(grid().rows()).toEqual(ROWS);
    });

    it('moves focus to Refresh once stale departures load', async () => {
      await staleTampere();
      await pressTryAgain();

      source.latestDepartures('TPE').resolve(ROWS);
      await settle();

      expect(alertBox()).toBeNull();
      expect(document.activeElement).toBe(button('Refresh'));
    });

    it('shows a failed first load inline with an empty grid', async () => {
      await failedTampere();

      expect(alertBox()?.textContent).toContain("Couldn't load departures from Tampere.");
      expect(grid().rows()).toEqual([]);
      expect(button('Try again')).toBeDefined();
    });

    it('moves focus to Refresh when a failed load comes back empty', async () => {
      await failedTampere();
      await pressTryAgain();

      source.latestDepartures('TPE').resolve([]);
      await settle();

      expect(alertBox()).toBeNull();
      expect(document.activeElement).toBe(button('Refresh'));
    });

    it('offers Try again when Digitraffic lists no stations', async () => {
      source.latestStations().resolve([]);
      await settle();

      expect(alertBox()?.textContent).toContain('No stations available.');
      expect(optionTexts()).toEqual(['No stations available.']);

      await pressTryAgain();

      expect(source.stationsCalls).toHaveLength(2);
    });
  });

  it('clears the board when the placeholder is chosen again', async () => {
    await showTampere();

    await chooseStation('');

    expect(grid().rows()).toEqual([]);
    expect(liveRegion().textContent?.trim()).toBe('Choose a station to see its next departures.');
  });
});
