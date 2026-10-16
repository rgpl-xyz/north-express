import { describe, expect, it } from 'vitest';
import type { Station } from '../../data/departures.models';
import { formatDistance, nearestTo } from './nearest';

const HELSINKI: Station = {
  code: 'HKI',
  name: 'Helsinki',
  position: { lat: 60.1714, lon: 24.9414 },
};
const PASILA: Station = { code: 'PSL', name: 'Pasila', position: { lat: 60.1987, lon: 24.9335 } };
const NOWHERE: Station = { code: 'X', name: 'No position' };

describe('nearestTo', () => {
  it('picks the closest station and gives its distance', () => {
    const nearest = nearestTo([HELSINKI, PASILA], { lat: 60.2052, lon: 24.9335 });

    expect(nearest?.station).toBe(PASILA);
    expect(nearest?.km).toBeCloseTo(0.72, 2);
  });

  it('passes over stations without a known position', () => {
    expect(nearestTo([NOWHERE, HELSINKI], { lat: 60.2, lon: 24.9 })?.station).toBe(HELSINKI);
  });

  it('finds nothing when no station has a position', () => {
    expect(nearestTo([NOWHERE], { lat: 60.2, lon: 24.9 })).toBeNull();
    expect(nearestTo([], { lat: 60.2, lon: 24.9 })).toBeNull();
  });
});

describe('formatDistance', () => {
  it('gives metres to the nearest 10 under a kilometre, never less than 10 m', () => {
    expect(formatDistance(0.7236)).toBe('720 m');
    expect(formatDistance(0.001)).toBe('10 m');
  });

  it('gives tenths of a kilometre under ten, then whole kilometres', () => {
    expect(formatDistance(1.234)).toBe('1.2 km');
    expect(formatDistance(15.4)).toBe('15 km');
  });

  it('rounds before it picks the unit', () => {
    expect(formatDistance(0.997)).toBe('1.0 km');
    expect(formatDistance(9.97)).toBe('10 km');
  });
});
