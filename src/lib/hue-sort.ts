// Sort paints by hue for the home paint wall and the colors page (#46, #47).
// Chromatic paints go around the wheel starting at red; greys and blacks go last, light to dark.
import { hexToRgb } from './contrast';

/**
 * Below this chroma (max minus min channel, 0 to 1) a paint reads as grey, so it sorts with
 * the neutrals. Chroma, not HSL saturation: saturation inflates for very light colors
 * (Chalk has HSL s 0.13 but chroma 0.05), while dark navies like Black Blue keep chroma 0.13.
 */
const NEUTRAL_CHROMA = 0.08;
/** Reds from this hue upward (crimsons) wrap around to sit with the other reds. */
const RED_WRAP_DEGREES = 340;
const NEUTRAL_OFFSET = 1000;

function hueChromaLightness(hex: string): { h: number; c: number; l: number } {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const c = max - min;
  if (c === 0) return { h: 0, c, l };
  const h =
    max === r ? 60 * (((g - b) / c) % 6) : max === g ? 60 * ((b - r) / c + 2) : 60 * ((r - g) / c + 4);
  return { h: (h + 360) % 360, c, l };
}

/** A number to sort by: hue for chromatic paints, then neutrals by lightness (light first). */
export function hueKey(hex: string): number {
  const { h, c, l } = hueChromaLightness(hex);
  if (c < NEUTRAL_CHROMA) return NEUTRAL_OFFSET + (1 - l) * 100;
  return h >= RED_WRAP_DEGREES ? h - 360 : h;
}

export function sortByHue<T extends { hex: string }>(paints: readonly T[]): T[] {
  return paints
    .map((p, i) => ({ p, i, k: hueKey(p.hex) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map(({ p }) => p);
}
