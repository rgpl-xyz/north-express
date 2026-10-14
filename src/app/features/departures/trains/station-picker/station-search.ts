import type { Station } from '../../data/departures.models';

/** Other names people look a station up by. Digitraffic has only the Finnish one. */
const ALIASES: Readonly<Record<string, readonly string[]>> = {
  LEN: ['Airport', 'Helsinki Airport'],
};

/** The other names a station is found by, such as "Airport" for Lentoasema. */
export function aliasesOf(station: Station): readonly string[] {
  return ALIASES[station.code] ?? [];
}

/** Lower case with the accents taken off, so "ahtari" finds Ähtäri and "seina" Seinäjoki. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** How well a station fits the search: 0 is its exact code, 1 a name starting with it. */
function fit(station: Station, search: string): number | null {
  if (fold(station.code) === search) {
    return 0;
  }
  const names = [station.name, ...aliasesOf(station)].map(fold);
  if (names.some((name) => name.startsWith(search))) {
    return 1;
  }
  return names.some((name) => name.includes(search)) ? 2 : null;
}

/**
 * The stations a search finds: those whose name or alias contains the text, accents
 * ignored, and the one whose code it is ("TPE"). The code's station comes first, then
 * names that start with the text, then the rest, each group in the stations' own order.
 * An empty search finds them all.
 */
export function searchStations(stations: readonly Station[], text: string): readonly Station[] {
  const search = fold(text.trim());
  if (!search) {
    return stations;
  }
  return stations
    .map((station, order) => ({ station, order, fit: fit(station, search) }))
    .filter(
      (entry): entry is { station: Station; order: number; fit: number } => entry.fit !== null,
    )
    .sort((a, b) => a.fit - b.fit || a.order - b.order)
    .map((entry) => entry.station);
}
