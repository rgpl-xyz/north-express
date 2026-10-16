import { type LatLon, kmBetween } from '../../../../shared/distance';
import type { Station } from '../../data/departures.models';

export interface Nearest {
  readonly station: Station;
  readonly km: number;
}

/** The station closest to `here`, among those with a known position, or null if none has one. */
export function nearestTo(stations: readonly Station[], here: LatLon): Nearest | null {
  let nearest: Nearest | null = null;
  for (const station of stations) {
    const km = station.position ? kmBetween(here, station.position) : Infinity;
    if (km < (nearest?.km ?? Infinity)) {
      nearest = { station, km };
    }
  }
  return nearest;
}

/** "720 m" under a kilometre, "1.2 km" under ten, then whole kilometres; rounded first. */
export function formatDistance(km: number): string {
  const metres = Math.max(10, Math.round(km * 100) * 10);
  if (metres < 1000) {
    return `${metres} m`;
  }
  const tenths = Math.round(km * 10) / 10;
  return tenths < 10 ? `${tenths.toFixed(1)} km` : `${Math.round(km)} km`;
}
