/** A point on the map, in degrees. */
export interface LatLon {
  readonly lat: number;
  readonly lon: number;
}

const EARTH_RADIUS_KM = 6371;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** The distance between two points in km, along the earth's surface (the haversine formula). */
export function kmBetween(a: LatLon, b: LatLon): number {
  const h =
    Math.sin(radians(b.lat - a.lat) / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(radians(b.lon - a.lon) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
