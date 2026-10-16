import type {
  DeparturesResponse,
  StationsResponse,
} from '../app/features/departures/data/digitransit-wire';
import kuopioArrivals from './digitransit-departures-matka-388199.json';
import kuopio from './digitransit-departures-matka-357077.json';
import kuopioPohjolanMatka from './digitransit-departures-pohjolanmatka-s4921.json';
import flixBus from './digitransit-departures-matka-466985.json';
import noHeadsigns from './digitransit-departures-matka-401830.json';
import stations from './digitransit-stations.json';
import tampere from './digitransit-departures-matka-358750.json';
import tapiola from './digitransit-departures-hsl-2000002.json';

/**
 * 26 stations trimmed from the stations query at 14:40 UTC on 14 October 2026. Bus
 * stations that several feeds list: Kuopio, Matkakeskus (three ids), Kokkola (four, in
 * two spellings), Kuopio's "Linja-autoasema" (four), Kamppi's two terminals and
 * Helsinki-Vantaan lentoasema, Matkakeskus (two each). Listed once: Tampere,
 * linja-autoasema, Tapiola (M), two Äänekoski stations, and the longest name in the list,
 * Kantasataman paikallisliikenneterminaali (Kotka). Plus one station each of RAIL, FERRY,
 * SUBWAY and no mode, which the bus board leaves out. Each has its name in Swedish (sv)
 * from the same feed, added on 16 October 2026; only Tapiola (M) has one of its own,
 * Hagalund (M).
 */
export const BUS_STATIONS_FIXTURE = stations as StationsResponse;

/**
 * The departures query for one Digitransit station, by id, at about 14:40 UTC on
 * 14 October 2026 (17:40 in Finland). Only Tapiola's HSL buses have live data. Each
 * trip's last stop has its position and station as Digitransit gave them on 16 October;
 * PohjolanMatka:61393, Kuopio's arrival platform in that feed, had gone from it by then,
 * so it has the position and id of its station, PohjolanMatka:s4921.
 */
export const BUS_DEPARTURES_FIXTURES: ReadonlyMap<string, DeparturesResponse> = new Map([
  // Tampere, linja-autoasema: 20 stoptimes, 4 of them buses that end there.
  ['MATKA:358750', tampere as DeparturesResponse],
  // Kuopio, Matkakeskus, from three feeds: 4 departures and 9 arrivals; 5 departures and 3
  // arrivals, none of them with a route number; arrivals only, at platform "Tulo".
  ['MATKA:357077', kuopio as DeparturesResponse],
  ['PohjolanMatka:s4921', kuopioPohjolanMatka as DeparturesResponse],
  ['MATKA:388199', kuopioArrivals as DeparturesResponse],
  // Linja-autoasema: FlixBus, with the route number as headsign; and a feed with no
  // headsigns that lists each bus under two trips.
  ['MATKA:466985', flixBus as DeparturesResponse],
  ['MATKA:401830', noHeadsigns as DeparturesResponse],
  // Tapiola (M): HSL, half with live data: one bus 4 minutes late, two 1 minute late, one
  // a minute early.
  ['HSL:2000002', tapiola as DeparturesResponse],
]);

/** The departures of one station in the fixtures; throws for a station without any. */
export function busDeparturesFixture(id: string): DeparturesResponse {
  const departures = BUS_DEPARTURES_FIXTURES.get(id);
  if (!departures) {
    throw new Error(`No departures fixture for ${id}`);
  }
  return departures;
}
