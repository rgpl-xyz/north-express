import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  InMemoryDepartureSource,
  TEST_STATIONS,
  departureRow,
} from '../../../../testing/in-memory-departure-source';
import { formatFinlandClock, formatFinlandTime } from '../../../shared/finland-time';
import { DepartureSource } from '../data/departure-source';
import type { Station } from '../data/departures.models';
import { DepartureBoard } from './departure-board';

const TAMPERE: Station = { code: 'TPE', name: 'Tampere' };
const HELSINKI: Station = { code: 'HKI', name: 'Helsinki' };
const ROWS = [departureRow({ id: 'a', train: 'IC 25' }), departureRow({ id: 'b', train: 'IC 38' })];

describe('DepartureBoard', () => {
  let source: InMemoryDepartureSource;
  let board: DepartureBoard;

  function updatedAt(): Date {
    const state = board.state();
    if (state.kind !== 'loaded' && state.kind !== 'empty' && state.kind !== 'stale') {
      throw new Error(`no updatedAt in a ${state.kind} board`);
    }
    return state.updatedAt;
  }

  /** Stations loaded, Tampere chosen and its departures shown. */
  function showTampere(): void {
    source.latestStations().resolve(TEST_STATIONS);
    board.selectStation('TPE');
    source.latestDepartures('TPE').resolve(ROWS);
  }

  /** Tampere's departures shown, then a refresh that failed. Returns when they were shown. */
  function staleTampere(): Date {
    showTampere();
    const shownAt = updatedAt();
    board.refresh();
    source.latestDepartures('TPE').fail();
    return shownAt;
  }

  beforeEach(() => {
    source = new InMemoryDepartureSource();
    TestBed.configureTestingModule({
      providers: [DepartureBoard, { provide: DepartureSource, useValue: source }],
    });
    board = TestBed.inject(DepartureBoard);
  });

  describe('stations', () => {
    it('starts loading the stations straight away', () => {
      expect(source.stationsCalls).toHaveLength(1);
      expect(board.stations()).toEqual({ kind: 'loading', previous: null });
      expect(board.stationPrompt()).toBe('Loading stations…');
      expect(board.alert()).toBeNull();
    });

    it('lists the stations once they arrive', () => {
      source.latestStations().resolve(TEST_STATIONS);

      expect(board.stations()).toEqual({ kind: 'loaded', stations: TEST_STATIONS });
      expect(board.stationPrompt()).toBe('Choose a station');
      expect(board.alert()).toBeNull();
    });

    it('reports a failure inline with a way to retry', () => {
      source.latestStations().fail();

      expect(board.stations()).toEqual({ kind: 'failed' });
      expect(board.alert()).toEqual({
        text: "Couldn't load stations.",
        action: 'retry-stations',
        busy: false,
      });
      expect(board.status()).toEqual({ text: "Couldn't load stations.", visible: false });
      expect(board.stationPrompt()).toBe("Couldn't load stations.");
    });

    it('keeps the alert, marked busy, while the stations load again', () => {
      source.latestStations().fail();

      board.retryStations();

      expect(source.stationsCalls).toHaveLength(2);
      expect(board.stations()).toEqual({ kind: 'loading', previous: { kind: 'failed' } });
      expect(board.alert()).toEqual({
        text: "Couldn't load stations.",
        action: 'retry-stations',
        busy: true,
      });
      expect(board.stationPrompt()).toBe('Loading stations…');
      expect(board.status()).toEqual({ text: 'Loading stations…', visible: false });
    });

    it('clears the alert when the retry succeeds', () => {
      source.latestStations().fail();
      board.retryStations();

      source.latestStations().resolve(TEST_STATIONS);

      expect(board.stations()).toEqual({ kind: 'loaded', stations: TEST_STATIONS });
      expect(board.alert()).toBeNull();
    });

    it('shows the alert again, not busy, when the retry fails too', () => {
      source.latestStations().fail();
      board.retryStations();

      source.latestStations().fail();

      expect(board.alert()).toEqual({
        text: "Couldn't load stations.",
        action: 'retry-stations',
        busy: false,
      });
    });

    it('treats an empty station list as a problem the user can retry', () => {
      source.latestStations().resolve([]);

      expect(board.stations()).toEqual({ kind: 'loaded', stations: [] });
      expect(board.stationPrompt()).toBe('No stations available.');
      expect(board.alert()).toEqual({
        text: 'No stations available.',
        action: 'retry-stations',
        busy: false,
      });
      expect(board.status()).toEqual({ text: 'No stations available.', visible: false });

      board.retryStations();

      expect(board.alert()).toEqual({
        text: 'No stations available.',
        action: 'retry-stations',
        busy: true,
      });
    });
  });

  describe('departures', () => {
    beforeEach(() => {
      source.latestStations().resolve(TEST_STATIONS);
    });

    it('starts idle, asking for a station', () => {
      expect(board.state()).toEqual({ kind: 'idle' });
      expect(board.status()).toEqual({
        text: 'Choose a station to see its next departures.',
        visible: true,
      });
      expect(board.alert()).toBeNull();
      expect(board.lastUpdated()).toBe('');
    });

    it('loads the departures of the chosen station', () => {
      board.selectStation('TPE');

      expect(source.departuresCalls.map((call) => call.stationCode)).toEqual(['TPE']);
      expect(board.state()).toEqual({
        kind: 'loading',
        station: TAMPERE,
        rows: [],
        previous: null,
      });
      expect(board.status()).toEqual({ text: 'Loading departures from Tampere…', visible: false });
      expect(board.alert()).toBeNull();
    });

    it('shows the departures once they arrive', () => {
      board.selectStation('TPE');
      source.latestDepartures('TPE').resolve(ROWS);

      expect(board.state()).toEqual({
        kind: 'loaded',
        station: TAMPERE,
        rows: ROWS,
        updatedAt: expect.any(Date),
      });
      expect(board.status()).toEqual({ text: '2 departures from Tampere.', visible: false });
      expect(board.lastUpdated()).toBe(`Last updated ${formatFinlandClock(updatedAt())}.`);
      expect(board.alert()).toBeNull();
    });

    it('uses the singular for one departure', () => {
      board.selectStation('TPE');
      source.latestDepartures('TPE').resolve([ROWS[0]]);

      expect(board.status().text).toBe('1 departure from Tampere.');
    });

    it('says when nothing departs soon', () => {
      board.selectStation('TPE');
      source.latestDepartures('TPE').resolve([]);

      expect(board.state()).toEqual({
        kind: 'empty',
        station: TAMPERE,
        updatedAt: expect.any(Date),
      });
      expect(board.status()).toEqual({
        text: 'No departures from Tampere in the coming hours.',
        visible: true,
      });
      expect(board.alert()).toBeNull();
    });

    it('reports a failed first load inline, with no rows', () => {
      board.selectStation('TPE');
      source.latestDepartures('TPE').fail();

      expect(board.state()).toEqual({ kind: 'failed', station: TAMPERE });
      expect(board.alert()).toEqual({
        text: "Couldn't load departures from Tampere.",
        action: 'refresh',
        busy: false,
      });
      expect(board.status()).toEqual({
        text: "Couldn't load departures from Tampere.",
        visible: false,
      });
      expect(board.lastUpdated()).toBe('');
    });

    it('keeps the shown rows and their time while refreshing', () => {
      showTampere();
      const shownAt = updatedAt();

      board.refresh();

      expect(source.departuresCalls).toHaveLength(2);
      expect(board.state()).toEqual({
        kind: 'loading',
        station: TAMPERE,
        rows: ROWS,
        previous: { kind: 'loaded', station: TAMPERE, rows: ROWS, updatedAt: shownAt },
      });
      expect(board.lastUpdated()).toBe(`Last updated ${formatFinlandClock(shownAt)}.`);
      expect(board.alert()).toBeNull();
    });

    it('marks the last rows as stale when a refresh fails', () => {
      const shownAt = staleTampere();

      expect(board.state()).toEqual({
        kind: 'stale',
        station: TAMPERE,
        rows: ROWS,
        updatedAt: shownAt,
      });
      const text = `Couldn't refresh. Showing departures from ${formatFinlandTime(shownAt)}.`;
      expect(board.alert()).toEqual({ text, action: 'refresh', busy: false });
      expect(board.status()).toEqual({ text, visible: false });
      expect(board.lastUpdated()).toBe(`Last updated ${formatFinlandClock(shownAt)}.`);
    });

    it('keeps stale rows labelled, with a busy alert, while trying again', () => {
      const shownAt = staleTampere();

      board.refresh();

      expect(board.state()).toEqual({
        kind: 'loading',
        station: TAMPERE,
        rows: ROWS,
        previous: { kind: 'stale', station: TAMPERE, rows: ROWS, updatedAt: shownAt },
      });
      expect(board.alert()).toEqual({
        text: `Couldn't refresh. Showing departures from ${formatFinlandTime(shownAt)}.`,
        action: 'refresh',
        busy: true,
      });
      expect(board.lastUpdated()).toBe(`Last updated ${formatFinlandClock(shownAt)}.`);
    });

    it('stays stale, with the original time, when trying again fails', () => {
      const shownAt = staleTampere();

      board.refresh();
      source.latestDepartures('TPE').fail();

      expect(board.state()).toEqual({
        kind: 'stale',
        station: TAMPERE,
        rows: ROWS,
        updatedAt: shownAt,
      });
      expect(board.alert()?.busy).toBe(false);
    });

    it('recovers from stale when trying again succeeds', () => {
      staleTampere();
      const fresh = [departureRow({ id: 'c', train: 'IC 467' })];

      board.refresh();
      source.latestDepartures('TPE').resolve(fresh);

      expect(board.state()).toEqual({
        kind: 'loaded',
        station: TAMPERE,
        rows: fresh,
        updatedAt: expect.any(Date),
      });
      expect(board.alert()).toBeNull();
    });

    it('keeps the failed alert, marked busy, while trying again', () => {
      board.selectStation('TPE');
      source.latestDepartures('TPE').fail();

      board.refresh();

      expect(board.state()).toEqual({
        kind: 'loading',
        station: TAMPERE,
        rows: [],
        previous: { kind: 'failed', station: TAMPERE },
      });
      expect(board.alert()).toEqual({
        text: "Couldn't load departures from Tampere.",
        action: 'refresh',
        busy: true,
      });
    });

    it('recovers from failed when trying again succeeds', () => {
      board.selectStation('TPE');
      source.latestDepartures('TPE').fail();

      board.refresh();
      source.latestDepartures('TPE').resolve(ROWS);

      expect(board.state().kind).toBe('loaded');
      expect(board.alert()).toBeNull();
    });

    it('stays failed when trying again fails too', () => {
      board.selectStation('TPE');
      source.latestDepartures('TPE').fail();

      board.refresh();
      source.latestDepartures('TPE').fail();

      expect(board.state()).toEqual({ kind: 'failed', station: TAMPERE });
      expect(board.alert()?.busy).toBe(false);
    });

    it('keeps the empty answer time while refreshing, and fails without rows', () => {
      board.selectStation('TPE');
      source.latestDepartures('TPE').resolve([]);
      const answeredAt = updatedAt();

      board.refresh();
      expect(board.lastUpdated()).toBe(`Last updated ${formatFinlandClock(answeredAt)}.`);
      source.latestDepartures('TPE').fail();

      expect(board.state()).toEqual({ kind: 'failed', station: TAMPERE });
    });

    it("does not carry one station's rows over to another", () => {
      showTampere();

      board.selectStation('HKI');

      expect(board.state()).toEqual({
        kind: 'loading',
        station: HELSINKI,
        rows: [],
        previous: null,
      });
      expect(board.lastUpdated()).toBe('');
      source.latestDepartures('HKI').fail();
      expect(board.state()).toEqual({ kind: 'failed', station: HELSINKI });
    });

    it('drops the answer for a station the user has moved away from', () => {
      board.selectStation('TPE');
      const tampere = source.latestDepartures('TPE');

      board.selectStation('HKI');
      tampere.resolve(ROWS);

      expect(tampere.cancelled).toBe(true);
      expect(board.state()).toMatchObject({ kind: 'loading', station: HELSINKI, rows: [] });

      const helsinkiRows = [departureRow({ id: 'h', destination: 'Turku' })];
      source.latestDepartures('HKI').resolve(helsinkiRows);

      expect(board.state()).toMatchObject({
        kind: 'loaded',
        station: HELSINKI,
        rows: helsinkiRows,
      });
    });

    it('drops an older refresh when a newer one starts, keeping what was shown before', () => {
      showTampere();
      const shownAt = updatedAt();
      board.refresh();
      const older = source.latestDepartures('TPE');

      board.refresh();

      expect(older.cancelled).toBe(true);
      expect(board.state()).toMatchObject({
        kind: 'loading',
        previous: { kind: 'loaded', updatedAt: shownAt },
      });
      source.latestDepartures('TPE').fail();
      expect(board.state()).toMatchObject({ kind: 'stale', rows: ROWS, updatedAt: shownAt });
    });

    it('goes back to idle when the station is cleared, dropping any request in flight', () => {
      board.selectStation('TPE');
      const tampere = source.latestDepartures('TPE');

      board.selectStation(null);

      expect(tampere.cancelled).toBe(true);
      expect(board.state()).toEqual({ kind: 'idle' });
      expect(board.status().text).toBe('Choose a station to see its next departures.');
    });

    it('does nothing on refresh while idle', () => {
      board.refresh();

      expect(source.departuresCalls).toEqual([]);
      expect(board.state()).toEqual({ kind: 'idle' });
    });

    it('ignores a code that is not a known station', () => {
      board.selectStation('XYZ');

      expect(source.departuresCalls).toEqual([]);
      expect(board.state()).toEqual({ kind: 'idle' });
    });
  });

  it('gives the station failure priority over the idle prompt', () => {
    source.latestStations().fail();

    expect(board.state()).toEqual({ kind: 'idle' });
    expect(board.alert()?.action).toBe('retry-stations');
    expect(board.status().visible).toBe(false);
  });
});
