import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DepartureSource } from './data/departure-source';
import { DigitrafficSource } from './data/digitraffic-source';
import { DigitransitBusSource } from './data/digitransit-bus-source';
import { DEPARTURES_ROUTES } from './departures.routes';
import { DeparturesPage } from './page/departures-page';

describe('DEPARTURES_ROUTES', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const sourceOnPage = () => harness.routeDebugElement?.injector.get(DepartureSource);
  const heading = () => harness.routeNativeElement?.querySelector('h1')?.textContent?.trim();

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(DEPARTURES_ROUTES),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    harness = await RouterTestingHarness.create();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('shows trains from Digitraffic at /trains', async () => {
    await harness.navigateByUrl('/trains', DeparturesPage);

    expect(sourceOnPage()).toBeInstanceOf(DigitrafficSource);
    expect(heading()).toBe('Train departures');
    http.expectOne('https://rata.digitraffic.fi/api/v1/metadata/stations');
  });

  it('shows buses from Digitransit, through the proxy, at /buses', async () => {
    await harness.navigateByUrl('/buses', DeparturesPage);

    expect(sourceOnPage()).toBeInstanceOf(DigitransitBusSource);
    expect(heading()).toBe('Bus departures');
    http.expectOne('/api/buses/stations');
  });
});
