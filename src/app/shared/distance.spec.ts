import { describe, expect, it } from 'vitest';
import { kmBetween } from './distance';

const HELSINKI = { lat: 60.171356, lon: 24.941444 };
const TAMPERE = { lat: 61.498248, lon: 23.773485 };

describe('kmBetween', () => {
  it('is zero from a point to itself', () => {
    expect(kmBetween(HELSINKI, HELSINKI)).toBe(0);
  });

  it('gives the straight-line distance, the same both ways', () => {
    // Helsinki to Tampere is about 160 km as the crow flies.
    expect(kmBetween(HELSINKI, TAMPERE)).toBeGreaterThan(159);
    expect(kmBetween(HELSINKI, TAMPERE)).toBeLessThan(162);
    expect(kmBetween(TAMPERE, HELSINKI)).toBeCloseTo(kmBetween(HELSINKI, TAMPERE), 9);
  });

  it('gives about 111 km for a degree of latitude', () => {
    expect(kmBetween({ lat: 60, lon: 25 }, { lat: 61, lon: 25 })).toBeCloseTo(111.2, 1);
  });
});
