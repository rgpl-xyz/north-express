import type {
  DepartureRow,
  DepartureStatus,
  DigitrafficStation,
  DigitrafficTimeTableRow,
  DigitrafficTrain,
  Station,
} from './departures.models';

/** Digitraffic train categories that carry passengers; cargo and shunting moves are left out. */
const PASSENGER_CATEGORIES: ReadonlySet<string> = new Set(['Long-distance', 'Commuter']);

/** Helsinki's ring-rail lines, which loop out to the airport and back. */
const RING_LINES: ReadonlySet<string> = new Set(['P', 'I']);
const AIRPORT_CODE = 'LEN';
const AIRPORT_DESTINATION = 'Lentoasema (Airport)';

const STATION_SUFFIX = / asema$/;

const finnishOrder = new Intl.Collator('fi');

/** "Helsinki asema" becomes "Helsinki"; "Pietari_(Finljandski)" becomes "Pietari (Finljandski)". */
export function stationDisplayName(stationName: string): string {
  return stationName.replace(STATION_SUFFIX, '').replaceAll('_', ' ');
}

/** Passenger stations, named for display and sorted in Finnish alphabetical order. */
export function toStations(stations: readonly DigitrafficStation[]): Station[] {
  return stations
    .filter((station) => station.passengerTraffic)
    .map((station) => ({
      code: station.stationShortCode,
      name: stationDisplayName(station.stationName),
    }))
    .sort((a, b) => finnishOrder.compare(a.name, b.name));
}

export function trainLabel(
  train: Pick<DigitrafficTrain, 'commuterLineID' | 'trainType' | 'trainNumber'>,
): string {
  return train.commuterLineID
    ? `Commuter ${train.commuterLineID}`
    : `${train.trainType} ${train.trainNumber}`;
}

export function departureStatus(
  train: Pick<DigitrafficTrain, 'cancelled'>,
  row: Pick<DigitrafficTimeTableRow, 'cancelled' | 'differenceInMinutes'>,
): DepartureStatus {
  if (train.cancelled || row.cancelled) {
    return { label: 'Cancelled', kind: 'cancelled' };
  }
  const delay = row.differenceInMinutes ?? 0;
  return delay > 0
    ? { label: `${delay} min late`, kind: 'late' }
    : { label: 'On time', kind: 'on-time' };
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
  const status = departureStatus(train, departure);
  return {
    id: `${train.departureDate}-${train.trainNumber}`,
    scheduled: departure.scheduledTime,
    expected: departure.actualTime ?? departure.liveEstimateTime ?? null,
    delayMinutes: departure.differenceInMinutes ?? null,
    destination: destinationOf(train, index, stationNames),
    track: departure.commercialTrack ?? '',
    train: trainLabel(train),
    status: status.label,
    statusKind: status.kind,
  };
}

/**
 * One row per passenger train that passengers can board at the station, sorted by
 * scheduled departure. `stationNames` maps station codes to display names for the
 * destination column.
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
