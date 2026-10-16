import { describe, expect, it } from 'vitest';
import type { Station } from '../../data/departures.models';
import { aliasesOf, fold, searchStations } from './station-search';

const STATIONS: readonly Station[] = [
  { code: 'HKI', name: 'Helsinki', aliases: ['Helsingfors'] },
  { code: 'LEN', name: 'Lentoasema', aliases: ['Flygplatsen', 'Airport', 'Helsinki Airport'] },
  { code: 'PSL', name: 'Pasila', aliases: ['Böle'] },
  { code: 'SK', name: 'Seinäjoki' },
  { code: 'TPE', name: 'Tampere', aliases: ['Tammerfors'] },
  { code: 'ÄHT', name: 'Ähtäri' },
];

const names = (text: string) => searchStations(STATIONS, text).map((station) => station.name);

describe('fold', () => {
  it('drops case and accents', () => {
    expect(fold('Ähtäri')).toBe('ahtari');
    expect(fold('SEINÄJOKI')).toBe('seinajoki');
    expect(fold('Åbo')).toBe('abo');
  });
});

describe('searchStations', () => {
  it('finds every station for an empty or blank search', () => {
    expect(names('')).toHaveLength(STATIONS.length);
    expect(names('   ')).toHaveLength(STATIONS.length);
  });

  it('ignores accents and case', () => {
    expect(names('ahtari')).toEqual(['Ähtäri']);
    expect(names('SEINA')).toEqual(['Seinäjoki']);
  });

  it('finds the text anywhere in a name, with names that start with it first', () => {
    // Lentoasema starts with "a" by its alias, Airport.
    expect(names('a')).toEqual(['Lentoasema', 'Ähtäri', 'Pasila', 'Seinäjoki', 'Tampere']);
    expect(names('si')).toEqual(['Helsinki', 'Lentoasema', 'Pasila']);
    expect(names('pa')).toEqual(['Pasila']);
  });

  it('puts the station a code belongs to first', () => {
    expect(names('tpe')[0]).toBe('Tampere');
    expect(names('aht')[0]).toBe('Ähtäri');
  });

  it('finds Lentoasema by "airport" too', () => {
    expect(names('airport')).toEqual(['Lentoasema']);
    expect(names('helsinki air')).toEqual(['Lentoasema']);
    expect(aliasesOf(STATIONS[1])).toEqual(['Flygplatsen', 'Airport', 'Helsinki Airport']);
  });

  it('finds a bilingual station by its Swedish name, accents ignored', () => {
    expect(names('helsingfors')).toEqual(['Helsinki']);
    expect(names('bole')).toEqual(['Pasila']);
    expect(names('tammer')).toEqual(['Tampere']);
    expect(aliasesOf(STATIONS[3])).toEqual([]);
  });

  it('finds nothing for text no station has', () => {
    expect(names('xyz')).toEqual([]);
  });
});
