// Map base tiles: CARTO "Dark Matter" raster tiles (#54). CARTO requires a key on every
// request; without one each tile is an "API KEY REQUIRED" image. The key is free for
// non-commercial use (up to 5M tile requests a month) and is sent in every tile URL, so it is
// public by design, like the Turnstile site key: a NEXT_PUBLIC_ value with the key as fallback.
// Fallback provider if CARTO's terms tighten: OpenFreeMap (no key), see #54.

const CARTO_BASEMAPS_KEY = process.env.NEXT_PUBLIC_CARTO_BASEMAPS_KEY || 'cb1_58rh_1_39b8d6f0899fac285d41b2e7';

/** Leaflet tile URL template; `{r}` becomes "@2x" on high-density screens. */
export function tileUrl(key: string = CARTO_BASEMAPS_KEY): string {
  return `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`;
}

/** CARTO's terms require this attribution on every map. */
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
