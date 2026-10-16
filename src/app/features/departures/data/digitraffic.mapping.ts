import type { DepartureRow, DepartureStatus, Station } from './departures.models';
import type {
  DigitrafficStation,
  DigitrafficTimeTableRow,
  DigitrafficTrain,
} from './digitraffic-wire';
import { SWEDISH_NAMES } from './digitraffic-swedish-names';

/** Digitraffic train categories that carry passengers; cargo and shunting moves are left out. */
const PASSENGER_CATEGORIES: ReadonlySet<string> = new Set(['Long-distance', 'Commuter']);

/** Helsinki's ring-rail lines, which loop out to the airport and back. */
const RING_LINES: ReadonlySet<string> = new Set(['P', 'I']);
const AIRPORT_CODE = 'LEN';
const AIRPORT_DESTINATION = 'Lentoasema (Airport)';

const STATION_SUFFIX = / asema$/;

const finnishOrder = new Intl.Collator('fi');

/** "Helsinki asema" becomes "Helsinki"; "Pietari_(Finljandski)" becomes "Pietari (Finljandski)". */
function stationDisplayName(stationName: string): string {
  return stationName.replace(STATION_SUFFIX, '').replaceAll('_', ' ');
}

/** Names people search for in English, besides the Swedish ones. */
const ENGLISH_NAMES: Readonly<Record<string, readonly string[]>> = {
  [AIRPORT_CODE]: ['Airport', 'Helsinki Airport'],
};

/** A station's other names: its Swedish name if it has one, then any English ones. */
function aliasesFor(code: string): readonly string[] {
  const swedish = SWEDISH_NAMES[code];
  return [...(swedish ? [swedish] : []), ...(ENGLISH_NAMES[code] ?? [])];
}

/**
 * Passenger stations, named for display and sorted in Finnish alphabetical order, with
 * the other names people look them up by.
 */
export function toStations(stations: readonly DigitrafficStation[]): Station[] {
  return stations
    .filter((station) => station.passengerTraffic)
    .map((station) => {
      const aliases = aliasesFor(station.stationShortCode);
      return {
        code: station.stationShortCode,
        name: stationDisplayName(station.stationName),
        position: { lat: station.latitude, lon: station.longitude },
        ...(aliases.length > 0 && { aliases }),
      };
    })
    .sort((a, b) => finnishOrder.compare(a.name, b.name));
}

function trainLabel(
  train: Pick<DigitrafficTrain, 'commuterLineID' | 'trainType' | 'trainNumber'>,
): string {
  return train.commuterLineID
    ? `Commuter ${train.commuterLineID}`
    : `${train.trainType} ${train.trainNumber}`;
}

function departureStatus(
  train: Pick<DigitrafficTrain, 'cancelled'>,
  row: Pick<DigitrafficTimeTableRow, 'cancelled' | 'differenceInMinutes'>,
): DepartureStatus {
  if (train.cancelled || row.cancelled) {
    return { kind: 'cancelled' };
  }
  const minutes = row.differenceInMinutes ?? 0;
  return minutes > 0 ? { kind: 'late', minutes } : { kind: 'on-time' };
}

/** A departure passengers can board: a commercial stop, not a technical one. */
function isBoardableDeparture(row: DigitrafficTimeTableRow, stationCode: string): boolean {
  return (
    row.stationShortCode === stationCode &&
    row.type === 'DEPARTURE' &&
    row.trainStopping &&
    row.commercialStop === true
  );
}

/**
 * Index of the timetable row to show, or -1. Ring-line trains call at Pasila twice and
 * Digitraffic keeps returning them after the first pass has gone, so take the first
 * pass that has not departed yet (no actualTime), else the last pass.
 */
function departureIndex(train: DigitrafficTrain, stationCode: string): number {
  const passes = train.timeTableRows.flatMap((row, index) =>
    isBoardableDeparture(row, stationCode) ? [index] : [],
  );
  const upcoming = passes.find((index) => !train.timeTableRows[index].actualTime);
  return upcoming ?? passes.at(-1) ?? -1;
}

/**
 * Ring-line trains show the airport as their destination until they have passed it,
 * as HSL's own displays do; every other train shows its last station.
 */
function destinationOf(
  train: DigitrafficTrain,
  index: number,
  stationNames: ReadonlyMap<string, string>,
): string {
  const rows = train.timeTableRows;
  const isRingLine = RING_LINES.has(train.commuterLineID ?? '');
  if (isRingLine && rows.slice(index + 1).some((row) => row.stationShortCode === AIRPORT_CODE)) {
    return AIRPORT_DESTINATION;
  }
  const lastStation = rows.at(-1)?.stationShortCode ?? '';
  return stationNames.get(lastStation) ?? lastStation;
}

function toDepartureRow(
  train: DigitrafficTrain,
  index: number,
  stationNames: ReadonlyMap<string, string>,
): DepartureRow {
  const departure = train.timeTableRows[index];
  return {
    id: `${train.departureDate}-${train.trainNumber}`,
    scheduled: departure.scheduledTime,
    expected: departure.actualTime ?? departure.liveEstimateTime ?? null,
    destination: destinationOf(train, index, stationNames),
    track: departure.commercialTrack ?? '',
    train: trainLabel(train),
    status: departureStatus(train, departure),
  };
}

/**
 * One row per passenger train that passengers can board at the station, sorted by
 * scheduled departure: the order the departure board shows them in. `stationNames`
 * maps station codes to display names for the destination column.
 */
export function toDepartureRows(
  trains: readonly DigitrafficTrain[],
  stationCode: string,
  stationNames: ReadonlyMap<string, string>,
): DepartureRow[] {
  return trains
    .filter((train) => PASSENGER_CATEGORIES.has(train.trainCategory))
    .flatMap((train) => {
      const index = departureIndex(train, stationCode);
      return index >= 0 ? [toDepartureRow(train, index, stationNames)] : [];
    })
    .sort((a, b) => Date.parse(a.scheduled) - Date.parse(b.scheduled));
}
