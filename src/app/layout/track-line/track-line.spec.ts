import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TrackLine, placeStops } from './track-line';

describe('placeStops', () => {
  it('puts the first and last stops near the ends as termini, the rest between them', () => {
    const stops = placeStops(['Helsinki', 'Pasila', 'Tampere'], 640);

    expect(stops.map((stop) => stop.terminus)).toEqual([true, false, true]);
    expect(stops[0]).toMatchObject({ x: 40, y: 200, side: 'below' });
    expect(stops[2].y).toBe(60);
    expect(stops[2].side).toBe('above');
    expect(stops[2].x).toBeCloseTo(600);
  });

  it('names a stop on the climb to its right', () => {
    const [, middle] = placeStops(['A', 'B', 'C'], 640);

    expect(middle.side).toBe('right');
    expect(middle.y).toBeGreaterThan(60);
    expect(middle.y).toBeLessThan(200);
  });

  it('places a single stop halfway along', () => {
    const [only] = placeStops(['Only'], 640);

    expect(only.terminus).toBe(true);
    expect(only.side).toBe('right');
  });
});

describe('TrackLine', () => {
  it('draws a dot and a name for each stop, hidden from assistive technology', async () => {
    const fixture = TestBed.createComponent(TrackLine);
    fixture.componentRef.setInput('stops', ['Helsinki', 'Pasila', 'Tampere']);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelectorAll('circle')).toHaveLength(3);
    expect(
      Array.from(element.querySelectorAll('text'), (name) => name.textContent?.trim()),
    ).toEqual(['Helsinki', 'Pasila', 'Tampere']);
  });

  it('ends the line at a buffer stop when asked', async () => {
    const fixture = TestBed.createComponent(TrackLine);
    fixture.componentRef.setInput('ends', 'buffer');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.rail')?.getAttribute('d')).toMatch(/H560$/);
    expect(element.querySelector('.buffer')).not.toBeNull();
  });

  it('starts and stops the line at its first and last stations when asked', async () => {
    const fixture = TestBed.createComponent(TrackLine);
    fixture.componentRef.setInput('ends', 'stations');
    fixture.componentRef.setInput('named', false);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.rail')?.getAttribute('d')).toMatch(/^M40 200.*H600$/);
    expect(element.querySelectorAll('text')).toHaveLength(0);
  });
});
