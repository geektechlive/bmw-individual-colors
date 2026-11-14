// A readable form of a paint for text, bars and accents on its color page (#45, ADR 0016
// rule 6). The swatch keeps the paint's own hex; anything that has to be read uses this.
import { composite, contrastRatio } from './contrast';
import { TOKENS, MIN_TEXT_CONTRAST } from './design-tokens';

/** Opacity of the paint wash behind the color page hero. Text sits on it, so it is tested. */
export const PAINT_WASH_ALPHA = 0.14;

// Lighten toward the site's main text color: it passes on every dark surface.
const LIGHT = TOKENS['ink'];
const STEP = 0.02;

/**
 * The opaque surfaces paint-colored text can sit on: the ground, the panels, and the hero,
 * which is the ground with the paint washed over it (composited, so contrast is real).
 */
export function paintSurfaces(paintHex: string): string[] {
  return [
    TOKENS['bg'],
    TOKENS['panel'],
    TOKENS['panel-2'],
    composite(paintHex, PAINT_WASH_ALPHA, TOKENS['bg']),
  ];
}

const passesAll = (hex: string, surfaces: readonly string[], min: number) =>
  surfaces.every((s) => contrastRatio(hex, s) >= min);

/**
 * The paint, lightened toward `ink` in small steps until it reaches `min` contrast on every
 * surface. A paint that already passes comes back unchanged. All surfaces are dark, so
 * lightening always converges (`ink` itself passes on each of them).
 */
export function readablePaint(paintHex: string, surfaces: readonly string[], min = MIN_TEXT_CONTRAST): string {
  if (passesAll(paintHex, surfaces, min)) return paintHex;
  for (let mix = STEP; mix < 1; mix += STEP) {
    const candidate = composite(LIGHT, mix, paintHex);
    if (passesAll(candidate, surfaces, min)) return candidate;
  }
  return LIGHT;
}
