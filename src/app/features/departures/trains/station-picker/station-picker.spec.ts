import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Station } from '../../data/departures.models';
import { StationPicker } from './station-picker';

const STATIONS: readonly Station[] = [
  { code: 'HKI', name: 'Helsinki' },
  { code: 'PSL', name: 'Pasila' },
  { code: 'TPE', name: 'Tampere' },
  { code: 'ÄHT', name: 'Ähtäri' },
];

describe('StationPicker', () => {
  let fixture: ComponentFixture<StationPicker>;
  let element: HTMLElement;

  const field = () => element.querySelector<HTMLInputElement>('input')!;
  const options = () =>
    Array.from(element.querySelectorAll('[role="option"]'), (option) => option.textContent?.trim());

  async function render(inputs: {
    stations?: readonly Station[];
    placeholder?: string;
    selected?: string | null;
  }): Promise<void> {
    fixture.componentRef.setInput('stations', inputs.stations ?? STATIONS);
    fixture.componentRef.setInput('placeholder', inputs.placeholder ?? 'Choose a station');
    fixture.componentRef.setInput('selected', inputs.selected ?? null);
    await fixture.whenStable();
  }

  async function type(text: string): Promise<void> {
    field().value = text;
    field().dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text }));
    await fixture.whenStable();
  }

  async function press(key: string): Promise<void> {
    field().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }

  beforeEach(() => {
    // jsdom has no layout, so nothing to scroll the highlighted station into.
    Element.prototype.scrollIntoView = vi.fn();
    TestBed.configureTestingModule({ imports: [StationPicker] });
    fixture = TestBed.createComponent(StationPicker);
    element = fixture.nativeElement as HTMLElement;
  });

  it('labels the field so screen readers announce it', async () => {
    await render({});

    const label = element.querySelector('label')!;
    expect(label.textContent?.trim()).toBe('Station');
    expect(label.getAttribute('for')).toBe(field().id);
    expect(field().getAttribute('role')).toBe('combobox');
  });

  it('shows the placeholder it is given, and is disabled without stations', async () => {
    await render({ stations: [], placeholder: 'Loading stations…' });

    expect(field().placeholder).toBe('Loading stations…');
    expect(field().disabled).toBe(true);
  });

  it('shows the selected station', async () => {
    await render({ selected: 'HKI' });

    expect(field().value).toBe('Helsinki');
  });

  it('narrows the list to what is typed, accents optional', async () => {
    await render({});

    await type('ahtari');

    expect(options()).toEqual(['Ähtäri']);
  });

  it('picks a station with the arrow keys and Enter, then shows its name', async () => {
    await render({});

    await type('tamp');
    await press('ArrowDown');
    await press('Enter');

    expect(fixture.componentInstance.selected()).toBe('TPE');
    expect(field().value).toBe('Tampere');
    expect(options()).toEqual([]);
  });

  it('takes the first match on Enter when none is highlighted', async () => {
    await render({});

    await type('pasi');
    await press('Enter');

    expect(fixture.componentInstance.selected()).toBe('PSL');
  });

  it('says when no station matches', async () => {
    await render({});

    await type('xyz');

    expect(options()).toEqual([]);
    expect(element.textContent).toContain('No station matches "xyz".');
  });

  it('puts the chosen station back on Escape, without changing it', async () => {
    await render({ selected: 'HKI' });

    await type('pas');
    await press('Escape');

    expect(field().value).toBe('Helsinki');
    expect(fixture.componentInstance.selected()).toBe('HKI');
  });

  it('can be focused by its parent', async () => {
    await render({});

    fixture.componentInstance.focus();

    expect(document.activeElement).toBe(field());
  });
});
