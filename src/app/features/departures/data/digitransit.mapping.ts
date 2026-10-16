import { kmBetween } from '../../../shared/distance';
import type { DepartureRow, DepartureStatus, Station } from './departures.models';
import {
  type DeparturesResponse,
  type DigitransitStation,
  type DigitransitStoptime,
  type GraphQlResponse,
  STATION_ID,
  type StationsResponse,
} from './digitransit-wire';

/** The bus stations to list, and the Digitransit stations behind each one's code. */
export interface BusStations {
  readonly stations: readonly Station[];
  readonly ids: ReadonlyMap<string, readonly string[]>;
}

/** Same-named stations closer than this are one station that several feeds list. */
const SAME_PLACE_KM = 1;

/** As many as the train board shows, and as many as the query asks each station for. */
const MAX_DEPARTURES = 20;

const finnishOrder = new Intl.Collator('fi');

/** The data of a GraphQL answer; an error when it reports one or has no data. */
function dataOf<T>(response: GraphQlResponse<T>): T {
  if (response.errors?.length || !response.data) {
    throw new Error(`Digitransit: ${response.errors?.[0]?.message ?? 'no data'}`);
  }
  return response.data;
}

/** "Kokkola Linja-autoasema" and "Kokkola, linja-autoasema" are the same name. */
function nameKey(name: string): string {
  return name.replaceAll(',', ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('fi');
}

/** Same-named stations near each other, each group in id order. */
function groupSamePlace(stations: readonly DigitransitStation[]): DigitransitStation[][] {
  const groups: DigitransitStation[][] = [];
  for (const station of [...stations].sort((a, b) => (a.gtfsId < b.gtfsId ? -1 : 1))) {
    const group = groups.find(
      ([first]) =>
        nameKey(first.name) === nameKey(station.name) && kmBetween(first, station) < SAME_PLACE_KM,
    );
    if (group) {
      group.push(station);
    } else {
      groups.push([station]);
    }
  }
  return groups;
}

/** The group's Swedish names that differ from the name it's listed under, each once. */
function swedishNames(group: readonly DigitransitStation[], name: string): string[] {
  const seen = new Set([nameKey(name)]);
  return group.flatMap(({ sv }) => {
    if (!sv || seen.has(nameKey(sv))) {
      return [];
    }
    seen.add(nameKey(sv));
    return [sv];
  });
}

/**
 * Bus stations, each listed once. Feeds list the same station separately (Kuopio's
 * Matkakeskus is in three), so same-named stations a short walk apart become one,
 * named in the "Town, place" form if one of them has it. Its code is its first
 * Digitransit id in capitals, because the page reads codes from the address in capitals.
 */
export function toBusStations(response: StationsResponse): BusStations {
  const busStations = dataOf(response).stations.filter(
    (station) => station.vehicleMode === 'BUS' && STATION_ID.test(station.gtfsId),
  );
  const listed = groupSamePlace(busStations)
    .map((group) => {
      const name = (group.find((station) => station.name.includes(', ')) ?? group[0]).name;
      const aliases = swedishNames(group, name);
      return {
        station: {
          code: group[0].gtfsId.toLocaleUpperCase('fi'),
          name,
          position: { lat: group[0].lat, lon: group[0].lon },
          ...(aliases.length > 0 && { aliases }),
        },
        ids: group.map((station) => station.gtfsId),
      };
    })
    .sort(
      (a, b) =>
        finnishOrder.compare(a.station.name, b.station.name) ||
        finnishOrder.compare(a.station.code, b.station.code),
    );
  return {
    stations: listed.map(({ station }) => station),
    ids: new Map(listed.map(({ station, ids }) => [station.code, ids])),
  };
}

function isoTime(serviceDay: number, seconds: number): string {
  return new Date((serviceDay + seconds) * 1000).toISOString();
}

/** Without live data only the timetable is known. A bus running early counts as on time. */
function busStatus(stoptime: DigitransitStoptime): DepartureStatus {
  if (stoptime.realtimeState === 'CANCELED') {
    return { kind: 'cancelled' };
  }
  if (!stoptime.realtime) {
    return { kind: 'scheduled' };
  }
  const minutes = Math.floor((stoptime.realtimeDeparture - stoptime.scheduledDeparture) / 60);
  return minutes > 0 ? { kind: 'late', minutes } : { kind: 'on-time' };
}

/**
 * The headsign, unless the feed leaves it out or repeats the route number in it (FlixBus
 * does); then the trip's last stop.
 */
function destinationOf({ headsign, trip }: DigitransitStoptime): string {
  if (headsign && headsign !== trip.route.shortName) {
    return headsign;
  }
  return trip.arrivalStoptime?.stop.name ?? headsign ?? '';
}

/**
 * A bus that ends here is arriving, though feeds still list it as a pickup. A loop that
 * starts and ends here leaves before it comes back, so the times tell the two apart.
 */
function isArrival({ stop, scheduledDeparture, trip }: DigitransitStoptime): boolean {
  const last = trip.arrivalStoptime;
  return last?.stop.gtfsId === stop.gtfsId && last.scheduledArrival <= scheduledDeparture;
}

/** Unix seconds. */
function departsAt({ serviceDay, scheduledDeparture }: DigitransitStoptime): number {
  return serviceDay + scheduledDeparture;
}

/**
 * Until when the merged departures are complete. A station that answered with all 20 may
 * have more after its last one, which another station's later departures would skip.
 */
function completeUntil(stations: readonly (readonly DigitransitStoptime[])[]): number {
  return Math.min(
    ...stations
      .filter((stoptimes) => stoptimes.length >= MAX_DEPARTURES)
      .map((stoptimes) => Math.max(...stoptimes.map(departsAt))),
  );
}

function toBusDepartureRow(stoptime: DigitransitStoptime): DepartureRow {
  const { serviceDay, scheduledDeparture, stop, trip } = stoptime;
  return {
    id: `${trip.gtfsId}/${stop.gtfsId}/${serviceDay + scheduledDeparture}`,
    scheduled: isoTime(serviceDay, scheduledDeparture),
    expected: stoptime.realtime ? isoTime(serviceDay, stoptime.realtimeDeparture) : null,
    destination: destinationOf(stoptime),
    track: stop.platformCode ?? '',
    // The route number, or the operator for routes without one, as many long-distance ones are.
    train: trip.route.shortName || trip.route.agency.name,
    status: busStatus(stoptime),
  };
}

/** What a row shows; some feeds list one bus under two trips. */
function shownAs(row: DepartureRow): string {
  return [row.scheduled, row.destination, row.track, row.train].join('|');
}

/** One row for each bus as shown, keeping the copy with live data if one has it. */
function shownOnce(rows: readonly DepartureRow[]): DepartureRow[] {
  const kept = new Map<string, DepartureRow>();
  for (const row of rows) {
    const earlier = kept.get(shownAs(row));
    if (!earlier || (earlier.expected === null && row.expected !== null)) {
      kept.set(shownAs(row), row);
    }
  }
  return [...kept.values()];
}

function stoptimesOf(response: DeparturesResponse): readonly DigitransitStoptime[] {
  const { station } = dataOf(response);
  if (!station) {
    throw new Error('Digitransit: no such station');
  }
  return station.stoptimesWithoutPatterns;
}

/**
 * The next departures from a bus station, given the departures of each Digitransit
 * station behind it: buses that end there are left out, rows that read the same are
 * shown once, nothing later than the stations' answers all reach is kept, and the first
 * 20 by scheduled time remain. An answer without data, such as an unknown station, is
 * an error.
 */
export function toBusDepartureRows(responses: readonly DeparturesResponse[]): DepartureRow[] {
  const stations = responses.map(stoptimesOf);
  const until = completeUntil(stations);
  const rows = stations
    .flat()
    .filter((stoptime) => !isArrival(stoptime) && departsAt(stoptime) <= until)
    .map(toBusDepartureRow)
    .sort((a, b) => Date.parse(a.scheduled) - Date.parse(b.scheduled));
  return shownOnce(rows).slice(0, MAX_DEPARTURES);
}
