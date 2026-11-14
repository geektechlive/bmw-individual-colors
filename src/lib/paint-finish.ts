// Paint finish for each swatch (#44, ADR 0016). The swatch draws solid, metallic, pearl
// and frozen paint differently, so it needs to know which one a paint is.
//
// Lookup order: the hand-filled catalog below, then the name (Frozen, then Pearl, then
// Metallic), then solid. Many metallic paints don't say so in their name, which is why
// the catalog exists. Paints whose name already says the finish don't need an entry.
// Only finishes the owner is sure of belong here; a paint left out is drawn as solid.

export const FINISHES = ['solid', 'metallic', 'pearl', 'frozen'] as const;
export type Finish = (typeof FINISHES)[number];

export const PAINT_FINISH: Readonly<Record<string, Finish>> = {
  'Daytona Violet': 'metallic',
  'Isle of Man Green': 'metallic',
  'Jerez Black': 'metallic',
  'Marina Bay Blue': 'metallic',
  'Portimao Blue': 'metallic',
  'San Marino Blue': 'metallic',
  'Sepang Bronze': 'metallic',
  'Snapper Rocks Blue': 'metallic',
  'Sunset Orange': 'metallic',
  'Tanzanite Blue': 'metallic',
  'Tanzanite Blue II': 'metallic',
  'Twilight Purple': 'metallic',
  'Velvet Blue': 'metallic',
  'Wildberry': 'metallic',
};

const normalize = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

const CATALOG = new Map(Object.entries(PAINT_FINISH).map(([name, finish]) => [normalize(name), finish]));

export function getPaintFinish(name: string | null | undefined): Finish {
  const key = normalize(name ?? '');
  if (!key) return 'solid';
  const known = CATALOG.get(key);
  if (known) return known;
  if (key.includes('frozen')) return 'frozen';
  if (key.includes('pearl')) return 'pearl';
  if (key.includes('metallic')) return 'metallic';
  return 'solid';
}
