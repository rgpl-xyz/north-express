import { describe, expect, it } from 'vitest';
import { operatorName } from './operator-names';

describe('operatorName', () => {
  it('leaves a name that is already short alone', () => {
    expect(operatorName('OnniBus')).toBe('OnniBus');
    expect(operatorName('Pohjolan Matka')).toBe('Pohjolan Matka');
    expect(operatorName('Linja-autoliikenne Samuli Haarasilta')).toBe(
      'Linja-autoliikenne Samuli Haarasilta',
    );
  });

  it('drops the legal form, wherever it is', () => {
    expect(operatorName('Valkeakosken Liikenne Oy')).toBe('Valkeakosken Liikenne');
    expect(operatorName('Liikenne O. Eteläpää Oy')).toBe('Liikenne O. Eteläpää');
    expect(operatorName('Nurmijärven Linja Oy / Korsisaari')).toBe(
      'Nurmijärven Linja / Korsisaari',
    );
    expect(operatorName('Oy Esimerkki Ab')).toBe('Esimerkki');
  });

  it('keeps a legal form that is part of a word', () => {
    expect(operatorName('Oyster Abbey Oy')).toBe('Oyster Abbey');
  });

  it('drops a full name in brackets and an HSL contract area', () => {
    expect(operatorName('Wikström / Amper (Oy Amper & Wikström Ab)')).toBe('Wikström / Amper');
    expect(operatorName('Korsisaari, Länsi-Uusimaa')).toBe('Korsisaari');
    expect(operatorName('Koiviston Auto Länsi, Länsi-Uusimaa')).toBe('Koiviston Auto Länsi');
  });

  it('uses the name on the buses where it differs', () => {
    expect(operatorName('Helsingin seudun liikenne')).toBe('HSL');
    expect(operatorName('FlixBus Finland Oy')).toBe('FlixBus');
  });

  it('keeps the name as it is when nothing would be left', () => {
    expect(operatorName('Oy')).toBe('Oy');
  });
});
