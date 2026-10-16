/*
 * Digitraffic timestamps are UTC. Angular's DatePipe only takes UTC offsets, not
 * IANA zones, so Intl does the conversion and handles summer time for us.
 */
const FINLAND_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Helsinki',
  hour: '2-digit',
  minute: '2-digit',
});

const FINLAND_CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Helsinki',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const FINLAND_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Helsinki',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

type TimeValue = string | Date | null | undefined;

function toDate(value: TimeValue): Date | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "14:02" in Finland time, or "" when there is no valid time. */
export function formatFinlandTime(value: TimeValue): string {
  const date = toDate(value);
  return date ? FINLAND_TIME.format(date) : '';
}

/** "14:02:07" in Finland time, or "" when there is no valid time. */
export function formatFinlandClock(value: TimeValue): string {
  const date = toDate(value);
  return date ? FINLAND_CLOCK.format(date) : '';
}

/** The day in Finland, as "2026-10-14", which sorts as text; "" when there is no valid time. */
export function finlandDay(value: TimeValue): string {
  const date = toDate(value);
  return date ? FINLAND_DAY.format(date) : '';
}
