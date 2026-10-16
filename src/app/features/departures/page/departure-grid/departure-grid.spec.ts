import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AgGridAngular } from 'ag-grid-angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { departureRow } from '../../../../../testing/in-memory-departure-source';
import type { DepartureRow } from '../../data/departures.models';
import type { BoardRow } from './board-lines';
import type { DestinationActions } from './departure-columns';
import { DepartureGrid } from './departure-grid';

/** A departure with the given id, leaving at the given UTC time on 13 October 2026. */
function departure(id: string, utcTime: string): DepartureRow {
  return departureRow({ id, scheduled: `2026-10-13T${utcTime}:00.000Z` });
}

describe('DepartureGrid', () => {
  let fixture: ComponentFixture<DepartureGrid>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DepartureGrid);
  });

  async function show(rows: readonly DepartureRow[]): Promise<void> {
    fixture.componentRef.setInput('rows', rows);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  /** Row ids in the order the grid displays them. */
  function displayedIds(): string[] {
    const grid = fixture.debugElement.query(By.directive(AgGridAngular))
      .componentInstance as AgGridAngular<DepartureRow>;
    const ids: string[] = [];
    grid.api.forEachNodeAfterFilterAndSort((node) => ids.push(node.id ?? ''));
    return ids;
  }

  it('keeps the order the departure board gives it, without sorting again', async () => {
    await show([departure('later', '11:10'), departure('earlier', '11:00')]);

    expect(displayedIds()).toEqual(['later', 'earlier']);
  });

  it('moves a departure that a refresh puts later, as with a ring train passing Pasila again', async () => {
    await show([departure('a', '07:00'), departure('ring', '07:05'), departure('b', '07:10')]);

    await show([departure('a', '07:00'), departure('b', '07:10'), departure('ring', '07:16')]);

    expect(displayedIds()).toEqual(['a', 'b', 'ring']);
  });
});

describe('DepartureGrid day breaks', () => {
  let fixture: ComponentFixture<DepartureGrid>;

  beforeEach(() => {
    // 23:00 on 13 October 2026 in Finland.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-13T20:00:00.000Z'));
    fixture = TestBed.createComponent(DepartureGrid);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const grid = () =>
    fixture.debugElement.query(By.directive(AgGridAngular))
      .componentInstance as AgGridAngular<DepartureRow>;

  /** The board's rows in order, each line as its id and what it says. */
  function boardRows(): string[] {
    const rows: string[] = [];
    grid().api.forEachNodeAfterFilterAndSort((node) => {
      const day = (node.data as BoardRow | undefined)?.day;
      rows.push(day ? `${node.id ?? ''}: ${day}` : (node.id ?? ''));
    });
    return rows;
  }

  async function show(rows: readonly DepartureRow[]): Promise<void> {
    fixture.componentRef.setInput('rows', rows);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  /** Sorts the board, waiting the task ag-grid takes to tell its listeners. */
  async function sortBy(colId: string, sort: 'asc' | null): Promise<void> {
    grid().api.applyColumnState({ state: [{ colId, sort }] });
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const ROWS = [
    departure('late', '20:50'), // 23:50
    departure('night', '21:15'), // 00:15, tomorrow
    departure('dawn', '23:30'), // 02:30
  ];

  it('puts a line saying tomorrow above the first departure after midnight', async () => {
    await show(ROWS);

    // The line is drawn in a real browser (e2e/buses.spec.ts).
    expect(boardRows()).toEqual(['late', 'night/day: Tomorrow', 'night', 'dawn']);
  });

  it('drops the day lines when the board is sorted by something other than time', async () => {
    await show(ROWS);

    await sortBy('destination', 'asc');
    expect(boardRows()).toEqual(['late', 'night', 'dawn']);

    await sortBy('destination', null);
    expect(boardRows()).toEqual(['late', 'night/day: Tomorrow', 'night', 'dawn']);
  });
});

describe('DepartureGrid destinations', () => {
  let fixture: ComponentFixture<DepartureGrid>;
  const LAHTI = departureRow({ id: 'lahti', destination: 'Lahti' });
  const LATER = departureRow({ id: 'later', destination: 'Turku' });

  beforeEach(async () => {
    fixture = TestBed.createComponent(DepartureGrid);
    fixture.componentRef.setInput('rows', [LAHTI, LATER]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const grid = () =>
    fixture.debugElement.query(By.directive(AgGridAngular))
      .componentInstance as AgGridAngular<DepartureRow>;
  /** What the grid gives its Destination cells. */
  const actions = () => grid().api.getGridOption('context') as DestinationActions;
  const announced = () =>
    (fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent?.trim();
  function rowIds(): string[] {
    const ids: string[] = [];
    grid().api.forEachNodeAfterFilterAndSort((node) => ids.push(node.id ?? ''));
    return ids;
  }

  async function explain(row: DepartureRow, target: HTMLElement): Promise<void> {
    actions().explain(row, target);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('puts a note under a destination with no board, and reads it out', async () => {
    await explain(LAHTI, document.createElement('button'));

    expect(rowIds()).toEqual(['lahti', 'lahti/note', 'later']);
    expect(announced()).toBe("Can't show departures from Lahti. It isn't in the list of stations.");
  });

  it('takes the note away on a second press, on Escape, and when new rows come in', async () => {
    const lahti = document.createElement('button');
    await explain(LAHTI, lahti);
    await explain(LAHTI, lahti);
    expect(rowIds()).toEqual(['lahti', 'later']);
    expect(announced()).toBe('');

    await explain(LAHTI, lahti);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(rowIds()).toEqual(['lahti', 'later']);

    await explain(LAHTI, lahti);
    fixture.componentRef.setInput('rows', [LAHTI]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(rowIds()).toEqual(['lahti']);
  });

  it('moves the note to the destination pressed next', async () => {
    await explain(LAHTI, document.createElement('button'));
    await explain(LATER, document.createElement('button'));

    expect(rowIds()).toEqual(['lahti', 'later', 'later/note']);
    expect(announced()).toBe("Can't show departures from Turku. It isn't in the list of stations.");
  });

  it('passes on the station a destination opens', () => {
    const picked = vi.fn();
    fixture.componentInstance.stationPicked.subscribe(picked);

    actions().open('HKI');

    expect(picked).toHaveBeenCalledWith('HKI');
  });
});
