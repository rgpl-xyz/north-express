# The North Express

Live departure boards for Finnish railway stations, built on Fintraffic's open rail data. A traveller picks a station and sees the next trains they can board there.

## Language

**Station**:
A place where passenger trains stop, known by its short code (HKI, TPE) and shown by its name without the "asema" suffix: "Helsinki", not "Helsinki asema". Only stations with passenger traffic count.
_Avoid_: stop, asema, location

**Departure**:
One train leaving one station: its scheduled and expected time, destination, track, train (IC 25, Commuter M) and status (On time, 2 min late, Cancelled). Cargo trains and shunting moves never make departures.
_Avoid_: train (one train makes many departures), trip, service

**Status**:
Whether a departure is on time, late by whole minutes, or cancelled. A train running early counts as on time. A departure is cancelled when the whole train is, or only its stop at this station.
_Avoid_: delay (an on-time departure has a status too), state

**Boardable stop**:
A stop in a train's timetable where passengers can get on: the train stops there and it is a commercial stop. Technical stops and stations the train runs through are not boardable, so they never become departures.
_Avoid_: stop on its own, halt, call

**Departure board**:
A station's next departures in scheduled order, together with what the traveller needs to know about them: still loading, nothing leaving in the coming hours, or a load failure.
_Avoid_: timetable, schedule, list

**Departure source**:
Where stations and departures come from: Digitraffic, Fintraffic's open rail data (CC BY 4.0). It decides which departures exist and what their destinations are called.
_Avoid_: API, feed, backend

**Ring train**:
A commuter train on the P or I line, which loops from Helsinki out to the airport and back. It passes Pasila twice, so its departure there is the next pass that hasn't left yet, and its destination is "Lentoasema (Airport)" until it has passed the airport.
_Avoid_: loop train, airport train, circle line

**Load failure**:
The departure source couldn't be reached, so stations or departures didn't load. It is shown on the board itself with Try again, never as a pop-up message.
_Avoid_: error, outage, crash

**Stale departures**:
What the board shows when a refresh fails after departures were already shown: the last departures that did load, labelled with the time they are from ("Couldn't refresh. Showing departures from 14:05.").
_Avoid_: cached departures, old data, outdated

## Example

> **Dev:** Pasila shows a P train leaving at 12:10, and it's already 13:00.
>
> **Domain expert:** That's the first pass of a ring train. It comes back through Pasila on its way into Helsinki, so the departure to show is the pass that hasn't left yet.
>
> **Dev:** What destination do we give it?
>
> **Domain expert:** Lentoasema (Airport) until it has passed the airport, then Helsinki.
>
> **Dev:** And if Refresh fails while Pasila's departures are up, do we clear the board?
>
> **Domain expert:** No, keep them as stale departures and say what time they are from. A load failure with nothing to show is different: say so on the board and offer Try again.
