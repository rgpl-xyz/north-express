import { describe, expect, it } from 'vitest';
import { departureRow } from '../../../../../testing/in-memory-departure-source';
import { dayBreaks } from './day-breaks';

// 23:00 on Wednesday 14 October 2026 in Finland (UTC+3).
const NOW = new Date('2026-10-14T20:00:00.000Z');

const at = (id: string, utc: string) => departureRow({ id, scheduled: utc });

describe('dayBreaks', () => {
  it('marks nothing while every departure is today', () => {
    expect(
      dayBreaks([at('a', '2026-10-14T20:10:00.000Z'), at('b', '2026-10-14T20:50:00.000Z')], NOW)
        .size,
    ).toBe(0);
  });

  it('marks the first departure after midnight as tomorrow, and only that one', () => {
    const breaks = dayBreaks(
      [
        at('late', '2026-10-14T20:50:00.000Z'), // 23:50
        at('night', '2026-10-14T21:15:00.000Z'), // 00:15
        at('morning', '2026-10-15T03:30:00.000Z'), // 06:30
      ],
      NOW,
    );

    expect([...breaks]).toEqual([['night', 'Tomorrow']]);
  });

  it('marks the first row when the board starts tomorrow', () => {
    expect([...dayBreaks([at('first', '2026-10-15T03:15:00.000Z')], NOW)]).toEqual([
      ['first', 'Tomorrow'],
    ]);
  });

  it('names a day further on', () => {
    const breaks = dayBreaks(
      [at('tomorrow', '2026-10-15T05:00:00.000Z'), at('friday', '2026-10-16T05:00:00.000Z')],
      NOW,
    );

    expect([...breaks]).toEqual([
      ['tomorrow', 'Tomorrow'],
      ['friday', 'Fri 16 Oct'],
    ]);
  });

  it('marks nothing for a departure on an earlier day', () => {
    expect(dayBreaks([at('old', '2026-10-13T08:00:00.000Z')], NOW).size).toBe(0);
  });
});
