import { describe, expect, it } from 'vitest';
import { formatFinlandClock, formatFinlandTime } from './finland-time';

describe('formatFinlandTime', () => {
  it('shows summer times in Finnish summer time (UTC+3)', () => {
    expect(formatFinlandTime('2026-10-13T11:02:00.000Z')).toBe('14:02');
  });

  it('shows winter times in Finnish standard time (UTC+2)', () => {
    expect(formatFinlandTime('2026-12-01T10:00:00.000Z')).toBe('12:00');
  });

  it('uses a 24 hour clock, including just after midnight', () => {
    expect(formatFinlandTime('2026-10-13T21:05:00.000Z')).toBe('00:05');
  });

  it('accepts Date objects', () => {
    expect(formatFinlandTime(new Date('2026-10-13T09:40:00.000Z'))).toBe('12:40');
  });

  it('returns an empty string for missing or invalid values', () => {
    expect(formatFinlandTime(null)).toBe('');
    expect(formatFinlandTime(undefined)).toBe('');
    expect(formatFinlandTime('')).toBe('');
    expect(formatFinlandTime('not a time')).toBe('');
  });
});

describe('formatFinlandClock', () => {
  it('includes seconds', () => {
    expect(formatFinlandClock(new Date('2026-10-13T09:32:07.000Z'))).toBe('12:32:07');
  });

  it('returns an empty string when there is no time', () => {
    expect(formatFinlandClock(null)).toBe('');
  });
});
