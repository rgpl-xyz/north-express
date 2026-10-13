import type {
  DigitrafficStation,
  DigitrafficTrain,
} from '../app/features/departures/data/digitraffic-wire';
import stations from './digitraffic-stations.json';
import pasilaRingTrain from './digitraffic-departures-psl-ring.json';
import tampereDepartures from './digitraffic-departures-tpe.json';

/**
 * 15 stations trimmed from GET /api/v1/metadata/stations on 13 October 2026:
 * passenger stations (one with a Finnish letter, one with underscores) plus
 * three without passenger traffic.
 */
export const STATIONS_FIXTURE = stations as readonly DigitrafficStation[];

/**
 * GET /api/v1/live-trains/station/TPE?...departing_trains=20... at 09:31 UTC on
 * 13 October 2026, cut to five trains. Each train keeps its first row, its Tampere
 * rows and its last row. Contains a 2 minute delay, a commuter train, a train with
 * no live estimate and a cargo train.
 */
export const TAMPERE_DEPARTURES_FIXTURE = tampereDepartures as readonly DigitrafficTrain[];

/**
 * One ring-line train (commuter P, HL 8665) from GET /api/v1/live-trains/station/PSL
 * at 10:09 UTC on 13 October 2026. It passes Pasila twice: the outbound pass (09:22)
 * has already departed and has an actualTime; the return pass (10:16) is still to
 * come. Rows kept: Helsinki departure, both Pasila passes, the airport (LEN) and the
 * final Helsinki arrival.
 */
export const PASILA_RING_TRAIN_FIXTURE = pasilaRingTrain as readonly DigitrafficTrain[];
