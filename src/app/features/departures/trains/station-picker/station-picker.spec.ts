import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Station } from '../../data/departures.models';
import { StationPicker } from './station-picker';

const STATIONS: readonly Station[] = [
  { code: 'HKI', name: 'Helsinki' },
  { code: 'TPE', name: 'Tampere' },
  { code: 'ÄHT', name: 'Ähtäri' },
];

describe('StationPicker', () => {
  let fixture: ComponentFixture<StationPicker>;
  let element: HTMLElement;

  const select = () => element.querySelector<HTMLSelectElement>('select')!;
  const optionTexts = () => Array.from(select().options).map((option) => option.text.trim());

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

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StationPicker] });
    fixture = TestBed.createComponent(StationPicker);
    element = fixture.nativeElement as HTMLElement;
  });

  it('labels the select so screen readers announce it', async () => {
    await render({});

    const label = element.querySelector('label')!;
    expect(label.textContent?.trim()).toBe('Station');
    expect(label.getAttribute('for')).toBe(select().id);
  });

  it('lists the stations after the placeholder it is given', async () => {
    await render({});

    expect(optionTexts()).toEqual(['Choose a station', 'Helsinki', 'Tampere', 'Ähtäri']);
    expect(select().disabled).toBe(false);
  });

  it('emits the chosen station code', async () => {
    await render({});
    const changes = vi.fn();
    fixture.componentInstance.selected.subscribe(changes);

    select().value = 'TPE';
    select().dispatchEvent(new Event('change'));

    expect(changes).toHaveBeenCalledWith('TPE');
    expect(fixture.componentInstance.selected()).toBe('TPE');
  });

  it('emits null when the placeholder is chosen again', async () => {
    await render({ selected: 'TPE' });

    select().value = '';
    select().dispatchEvent(new Event('change'));

    expect(fixture.componentInstance.selected()).toBeNull();
  });

  it('shows the selected station', async () => {
    await render({ selected: 'HKI' });

    expect(select().value).toBe('HKI');
  });

  it('can be focused by its parent', async () => {
    await render({});

    fixture.componentInstance.focus();

    expect(document.activeElement).toBe(select());
  });

  it('is disabled with only its placeholder when there are no stations to choose from', async () => {
    await render({ stations: [], placeholder: 'Loading stations…' });

    expect(select().disabled).toBe(true);
    expect(optionTexts()).toEqual(['Loading stations…']);
  });
});
