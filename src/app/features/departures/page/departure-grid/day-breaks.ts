import { finlandDay } from '../../../../shared/finland-time';
import type { DepartureRow } from '../../data/departures.models';

const DAY_NAME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Helsinki',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** The calendar day after one written as "2026-10-14". */
function dayAfter(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
}

/**
 * Where a board in scheduled order moves on to a later day, in Finland time: each row that
 * is the first of its day, with the day's name, "Tomorrow" or, further on, "Sat 18 Oct".
 * Counted from today, so a board whose first departure is tomorrow says so at the top.
 */
export function dayBreaks(rows: readonly DepartureRow[], now: Date): ReadonlyMap<string, string> {
  const today = finlandDay(now);
  const tomorrow = dayAfter(today);
  const breaks = new Map<string, string>();
  let current = today;
  for (const row of rows) {
    const day = finlandDay(row.scheduled);
    if (day > current) {
      breaks.set(row.id, day === tomorrow ? 'Tomorrow' : DAY_NAME.format(new Date(row.scheduled)));
      current = day;
    }
  }
  return breaks;
}
