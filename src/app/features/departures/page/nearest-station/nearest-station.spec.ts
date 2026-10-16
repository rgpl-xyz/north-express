import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Station } from '../../data/departures.models';
import { GEOLOCATION, NearestStation } from './nearest-station';

const STATIONS: readonly Station[] = [
  { code: 'HKI', name: 'Helsinki', position: { lat: 60.1714, lon: 24.9414 } },
  { code: 'PSL', name: 'Pasila', position: { lat: 60.1987, lon: 24.9335 } },
  { code: 'TPE', name: 'Tampere', position: { lat: 61.4983, lon: 23.7735 } },
];

const NEAR_PASILA = { coords: { latitude: 60.2052, longitude: 24.9335 } } as GeolocationPosition;
const blocked = { code: 1 } as GeolocationPositionError;
const timedOut = { code: 3 } as GeolocationPositionError;

interface Request {
  readonly found: PositionCallback;
  readonly failed: PositionErrorCallback;
}

/** A location service that keeps each request until the test answers it. */
function locationService() {
  const requests: Request[] = [];
  const service: Geolocation = {
    getCurrentPosition: vi.fn((found: PositionCallback, failed?: PositionErrorCallback | null) => {
      requests.push({ found, failed: failed ?? (() => undefined) });
    }),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  };
  return { service, requests, last: () => requests[requests.length - 1] };
}

async function render(service: Geolocation | null, stations = STATIONS) {
  TestBed.configureTestingModule({
    imports: [NearestStation],
    providers: [{ provide: GEOLOCATION, useValue: service }],
  });
  const fixture = TestBed.createComponent(NearestStation);
  fixture.componentRef.setInput('stations', stations);
  const picked = vi.fn();
  fixture.componentInstance.picked.subscribe(picked);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const button = () => element.querySelector('button');
  const settle = () => fixture.whenStable();
  const click = async () => {
    button()?.click();
    await settle();
  };
  return { fixture, component: fixture.componentInstance, button, click, settle, picked };
}

describe('NearestStation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('picks the station closest to the user and says how far away it is', async () => {
    const { service, last } = locationService();
    const { component, click, settle, picked } = await render(service);

    await click();
    last().found(NEAR_PASILA);
    await settle();

    expect(picked).toHaveBeenCalledWith('PSL');
    expect(component.message()).toBe('Pasila is 720 m from you.');
    expect(component.failed()).toBe(false);
  });

  it('says so when location is blocked, and picks nothing', async () => {
    const { service, last } = locationService();
    const { component, click, settle, picked } = await render(service);

    await click();
    last().failed(blocked);
    await settle();

    expect(picked).not.toHaveBeenCalled();
    expect(component.message()).toBe(
      'Location is blocked for this site. Allow it in your browser to find the nearest station.',
    );
    expect(component.failed()).toBe(true);
  });

  it('says so when no position can be had in time', async () => {
    const { service, last } = locationService();
    const { component, click, settle } = await render(service);

    await click();
    last().failed(timedOut);
    await settle();

    expect(component.message()).toBe(
      "Couldn't get your location. Try again, or search for the station.",
    );
  });

  it('shows Locating… while it waits, and asks only once', async () => {
    const { service } = locationService();
    const { button, click } = await render(service);

    await click();
    await click();

    expect(button()?.textContent?.trim()).toBe('Locating…');
    expect(button()?.getAttribute('aria-disabled')).toBe('true');
    expect(service.getCurrentPosition).toHaveBeenCalledOnce();
  });

  it('stops waiting after 20 seconds, as a prompt left open never answers', async () => {
    const timers = vi.spyOn(globalThis, 'setTimeout');
    const { service, last } = locationService();
    const { component, button, click, settle, picked } = await render(service);

    await click();
    const giveUp = timers.mock.calls.find(([, ms]) => ms === 20_000)?.[0] as () => void;
    giveUp();
    await settle();

    expect(button()?.textContent?.trim()).toBe('Nearest station');
    expect(button()?.getAttribute('aria-disabled')).toBeNull();
    expect(component.message()).toBe(
      "Couldn't get your location. Try again, or search for the station.",
    );

    // The prompt is answered at last: too late to pick anything.
    last().found(NEAR_PASILA);
    await settle();
    expect(picked).not.toHaveBeenCalled();
  });

  it('clears the message when another station is chosen', async () => {
    const { service, last } = locationService();
    const { fixture, component, click, settle } = await render(service);

    await click();
    last().found(NEAR_PASILA);
    fixture.componentRef.setInput('selected', 'PSL');
    await settle();
    expect(component.message()).toBe('Pasila is 720 m from you.');

    fixture.componentRef.setInput('selected', 'TPE');
    await settle();
    expect(component.message()).toBe('');
  });

  it('clears the last message while it tries again, so the same outcome is announced again', async () => {
    const { service, last } = locationService();
    const { component, click, settle } = await render(service);

    await click();
    last().failed(blocked);
    await settle();
    await click();

    expect(component.message()).toBe('');
  });

  it('ignores an answer that comes after the page has gone', async () => {
    const { service, last } = locationService();
    const { fixture, click, picked } = await render(service);

    await click();
    fixture.destroy();
    last().found(NEAR_PASILA);

    expect(picked).not.toHaveBeenCalled();
  });

  it('is disabled until there are stations to choose from', async () => {
    const { service } = locationService();
    const { button } = await render(service, []);

    expect(button()?.disabled).toBe(true);
  });

  it('is not there when the browser has no location service', async () => {
    const { button } = await render(null);

    expect(button()).toBeNull();
  });
});
