import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ModePictogram, type TransportMode } from './mode-pictogram';

async function drawn(mode: TransportMode): Promise<SVGElement | null> {
  TestBed.configureTestingModule({ imports: [ModePictogram] });
  const fixture = TestBed.createComponent(ModePictogram);
  fixture.componentRef.setInput('mode', mode);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).querySelector('svg');
}

describe('ModePictogram', () => {
  it('draws a train or a bus', async () => {
    expect((await drawn('train'))?.dataset['mode']).toBe('train');
    TestBed.resetTestingModule();
    expect((await drawn('bus'))?.dataset['mode']).toBe('bus');
  });

  it('is hidden from screen readers, as the words beside it say the same', async () => {
    const svg = await drawn('train');

    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
  });
});
