// Initial map view (#72). Fitting every located build puts a few far-off ones (Europe, Africa)
// in the box, which zooms a phone out to a world view with the dense US clusters off-screen.
// So the view fits the middle of the data: the TRIM share of points is dropped from each
// end of latitude and of longitude. Small sets are not trimmed.

export interface LatLngTuple {
  lat: number;
  lng: number;
}

export interface FitBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

const TRIM_SHARE = 0.1;
const MIN_POINTS_TO_TRIM = 10;

function trimmedRange(values: number[]): [number, number] {
  const sorted = [...values].sort((a, b) => a - b);
  const cut = sorted.length >= MIN_POINTS_TO_TRIM ? Math.floor(sorted.length * TRIM_SHARE) : 0;
  return [sorted[cut]!, sorted[sorted.length - 1 - cut]!];
}

/** The box to fit, or null when there is nothing located. A single point gives a zero-size box. */
export function fitBox(points: readonly LatLngTuple[]): FitBox | null {
  if (points.length === 0) return null;
  const [south, north] = trimmedRange(points.map((p) => p.lat));
  const [west, east] = trimmedRange(points.map((p) => p.lng));
  return { south, west, north, east };
}

/** Widest map (CSS px) that opens on the data; wider maps keep the world view (#72). */
export const FIT_MAX_WIDTH = 719;

/**
 * Only a phone-width map fits to the data. A desktop map already shows every build at the
 * world view, and fitting there would push the builds outside North America off-screen.
 */
export function shouldFitToData(mapWidthPx: number): boolean {
  return mapWidthPx <= FIT_MAX_WIDTH;
}
