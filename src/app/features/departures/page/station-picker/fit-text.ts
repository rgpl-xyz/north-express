/** Text is measured at this size, then scaled. */
const SAMPLE_PX = 100;

/** The page sets text about 1% wider than a canvas measures it, so leave some room. */
const MARGIN = 0.97;

let canvas: HTMLCanvasElement | undefined;

/**
 * The font size, in px, at which `text` in the element's font fits in `width` px, or null
 * where the browser can't measure text.
 */
export function sizeToFit(text: string, element: HTMLElement, width: number): number | null {
  if (!text || width <= 0) {
    return null;
  }
  const context = (canvas ??= document.createElement('canvas')).getContext('2d');
  if (!context) {
    return null;
  }
  const { fontStyle, fontWeight, fontFamily } = getComputedStyle(element);
  context.font = `${fontStyle} ${fontWeight} ${SAMPLE_PX}px ${fontFamily}`;
  const sampleWidth = context.measureText(text).width;
  return sampleWidth > 0 ? (width * MARGIN * SAMPLE_PX) / sampleWidth : null;
}
