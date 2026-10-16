import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AgGridAngular } from 'ag-grid-angular';
import { ClientSideRowModelApiModule, ModuleRegistry } from 'ag-grid-community';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { departureRow } from '../../../../../testing/in-memory-departure-source';
import type { DepartureRow } from '../../data/departures.models';
import type { BoardRow } from './departure-columns';
import { DepartureGrid } from './departure-grid';

// The grid reads only its sort through the API, so these tests register the part they read
// rows with.
ModuleRegistry.registerModules([ClientSideRowModelApiModule]);

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

  function dayBreaksShown(): string[] {
    const ids: string[] = [];
    grid().api.forEachNodeAfterFilterAndSort((node) => {
      if ((node.data as BoardRow | undefined)?.dayBreak) {
        ids.push(node.id ?? '');
      }
    });
    return ids;
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

  it('marks the first departure after midnight as the start of tomorrow', async () => {
    await show(ROWS);

    // The rule and the label are drawn in a real browser (e2e/buses.spec.ts).
    expect(dayBreaksShown()).toEqual(['night']);
  });

  it('drops the day breaks when the board is sorted by something other than time', async () => {
    await show(ROWS);

    await sortBy('destination', 'asc');
    expect(dayBreaksShown()).toEqual([]);

    await sortBy('destination', null);
    expect(dayBreaksShown()).toEqual(['night']);
  });
});
