# The North Express

Live train and bus departures in Finland. Pick a station, get the next departures with their destination, track or platform, and status.

https://north-express.app.rgpl.xyz

![Departures from Jokela](docs/departures.png)

Train data is from [Digitraffic](https://www.digitraffic.fi/en/) by Fintraffic, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). It needs no API key.

Bus data is from [Digitransit](https://digitransit.fi/en/), also CC BY 4.0. Its API needs a key, which stays on the server: the app asks its own `/api/buses`, and nginx adds the key and sends a fixed query (see [deploy/README.md](deploy/README.md)).

This started as an Angular 14 app on the Dutch NS API, which needs a subscription key. It has since been rebuilt on Angular 22 against Digitraffic so it runs on its own.

## Running it

Node 24, see `.nvmrc`.

```bash
npm ci
npm start    # http://localhost:4200
```

`npm start` sends `/api/buses` to the live site (`proxy.conf.json`), because the Digitransit key is only there.

```bash
npx ng test --watch=false   # unit tests, Vitest
npm run e2e                 # Playwright; run `npx playwright install chromium` once first
npx ng lint
npx ng build                # dist/north-express/browser
```

The e2e tests answer Digitraffic and `/api/buses` from fakes that serve the responses saved in `src/testing/`, so they never hit the real APIs. They run against `ng serve`. Set `E2E_BASE_URL` to test a running build instead, which is what CI does with the production build behind the nginx config in `deploy/nginx/`.

## Departures

Digitraffic returns whole trains with their full timetables. For the chosen station the app uses the first stop where passengers can board and the train hasn't left yet. The P and I ring trains call at Pasila twice, so taking the first stop would show a departure that already happened. Cargo trains and shunting moves are left out.

Ring trains on their way to the airport show "Lentoasema (Airport)" rather than Helsinki, where they end.

To find a station, type part of its name (Ähtäri can be typed as "ahtari") or its code, such as TPE, and pick it from the list. "Airport" finds Lentoasema. The station picked goes into the address, as in `/departures/trains?station=TPE`, so a board can be bookmarked or shared.

Only stations with passenger traffic are listed, without the "asema" that Digitraffic puts at the end of many names.

A train running early counts as on time, and delays are the whole minutes Digitraffic reports. A departure is cancelled when the whole train is, or just its stop at that station.

If Digitraffic can't be reached, the page says so and offers Try again. When only a refresh fails, the departures already shown stay up with the time they are from.

Times are Finland time whatever the viewer's time zone.

## Buses

Digitransit lists a bus station once in each operator's feed, sometimes spelled differently: Kuopio, Matkakeskus is in three. Stations with the same name, ignoring case and commas, less than a kilometre apart are listed once, with their departures merged. A bus listed twice under two trips is shown once.

Feeds also list buses that end at the station among its departures. These are arrivals and are left out. Where a feed gives no headsign, or only the route number, the destination is the trip's last stop.

Most long-distance feeds have no live data, so their buses say Scheduled rather than On time. HSL's buses have live data.

A station's code in the address is its first Digitransit id, as in `/departures/buses?station=MATKA:358750`.

## Stack

Angular 22 (standalone components, signals, zoneless), Bootstrap 5.3 with the app's own theme, ag-grid Community. Barlow and Barlow Condensed are self-hosted, so the browser's only outside requests go to rata.digitraffic.fi. Bus data comes through the app's own server.

## Deploying

Static build served by nginx on the rgpl VPS. CI runs the unit tests, the build and the e2e tests against that build on every push. Deploys are manual: [deploy/README.md](deploy/README.md).

## License

MIT, see [LICENSE](LICENSE).
