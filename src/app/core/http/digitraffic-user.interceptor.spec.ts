import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DIGITRAFFIC_USER,
  digitrafficUserInterceptor,
  isDigitrafficUrl,
} from './digitraffic-user.interceptor';

describe('isDigitrafficUrl', () => {
  it.each([
    'https://rata.digitraffic.fi/api/v1/metadata/stations',
    'https://tie.digitraffic.fi/api/v1/data',
    'https://digitraffic.fi/',
  ])('accepts %s', (url) => {
    expect(isDigitrafficUrl(url)).toBe(true);
  });

  it.each([
    'https://example.com/api',
    '/assets/data.json',
    'https://rata.digitraffic.fi.example.com/api',
    'https://notdigitraffic.fi/api',
    'http://rata.digitraffic.fi/api/v1/metadata/stations',
    'not a url',
  ])('rejects %s', (url) => {
    expect(isDigitrafficUrl(url)).toBe(false);
  });
});

describe('digitrafficUserInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([digitrafficUserInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('identifies the app on Digitraffic requests', () => {
    const url = 'https://rata.digitraffic.fi/api/v1/metadata/stations';
    client.get(url).subscribe();

    const request = http.expectOne(url);

    expect(DIGITRAFFIC_USER).toBe('rgpl-xyz/north-express');
    expect(request.request.headers.get('Digitraffic-User')).toBe(DIGITRAFFIC_USER);
    request.flush([]);
  });

  it.each([
    'https://example.com/api',
    '/assets/data.json',
    'https://rata.digitraffic.fi.example.com/',
  ])('leaves other requests alone: %s', (url) => {
    client.get(url).subscribe();

    const request = http.expectOne(url);

    expect(request.request.headers.has('Digitraffic-User')).toBe(false);
    request.flush({});
  });
});
