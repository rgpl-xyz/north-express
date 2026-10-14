import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AgGridAngular } from 'ag-grid-angular';
import { ClientSideRowModelApiModule, ModuleRegistry } from 'ag-grid-community';
import { beforeEach, describe, expect, it } from 'vitest';
import { departureRow } from '../../../../../testing/in-memory-departure-source';
import type { DepartureRow } from '../../data/departures.models';
import { DepartureGrid } from './departure-grid';

// The app never calls the grid API, so only these tests register the part they read rows with.
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
