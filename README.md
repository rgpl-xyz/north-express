# The North Express

Live train departures for Finnish railway stations. Pick a station, get the next trains with their destination, track and delay.

https://north-express.app.rgpl.xyz

![Departures from Helsinki](docs/departures.png)

Train data is from [Digitraffic](https://www.digitraffic.fi/en/) by Fintraffic, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). It needs no API key.

This started as an Angular 14 app on the Dutch NS API, which needs a subscription key. It has since been rebuilt on Angular 22 against Digitraffic so it runs on its own.

## Running it

Node 24, see `.nvmrc`.

```bash
npm ci
npm start    # http://localhost:4200
```

```bash
npx ng test --watch=false   # unit tests, Vitest
npm run e2e                 # Playwright; run `npx playwright install chromium` once first
npx ng lint
npx ng build                # dist/north-express/browser
```

The e2e tests mock Digitraffic with the responses saved in `src/testing/`, so they never hit the real API.

## Departures

Digitraffic returns whole trains with their full timetables. For the chosen station the app uses the first stop where passengers can board and the train hasn't left yet. The P and I ring trains call at Pasila twice, so taking the first stop would show a departure that already happened. Cargo trains and shunting moves are left out.

Ring trains on their way to the airport show "Lentoasema (Airport)" rather than Helsinki, where they end.

Times are Finland time whatever the viewer's time zone.

## Stack

Angular 22 (standalone components, signals, zoneless), Bootstrap 5.3 with the Bootswatch Lux theme, ag-grid Community. Nunito Sans is self-hosted, so the only outside requests go to rata.digitraffic.fi.
