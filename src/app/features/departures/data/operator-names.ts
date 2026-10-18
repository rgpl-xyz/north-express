/** Operators whose name in the feeds isn't the one on their buses. */
const KNOWN_AS: Readonly<Record<string, string>> = {
  'FlixBus Finland Oy': 'FlixBus',
  'Helsingin seudun liikenne': 'HSL',
};

/** A company's legal form, which a traveller doesn't need: Oy, Ab, Oyj, Ky. */
const LEGAL_FORM = /(^|\s)(?:Oy|Ab|Oyj|Ky)(?=\s|$)/g;

/**
 * An operator's name as a traveller reads it: "Valkeakosken Liikenne Oy" becomes
 * "Valkeakosken Liikenne". The legal form goes, as do a full name in brackets after the
 * short one and an HSL contract area after a comma ("Korsisaari, Länsi-Uusimaa"). A few
 * operators go by another name, such as HSL.
 */
export function operatorName(name: string): string {
  const known = KNOWN_AS[name];
  if (known) {
    return known;
  }
  const short = name
    .replace(/\s*\(.*\)\s*$/, '')
    .replace(/,.*$/, '')
    .replace(LEGAL_FORM, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return short || name;
}
