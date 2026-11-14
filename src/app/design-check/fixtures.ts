// Paint data for the /design-check fixture page. Paint hexes are data, not design colors, so
// like src/lib/colors.ts this file is exempt from the color-literal lint rule (eslint.config.mjs).
import { BMW_COLORS, getColorHex } from '../../lib/colors';
import type { Finish } from '../../lib/paint-finish';

export const LONGEST_NAME = Object.keys(BMW_COLORS).reduce((a, b) => (b.length > a.length ? b : a));
export const UNLISTED_NAME = 'Zzyzx Unlisted Paint';

export interface FixturePaint {
  label: string;
  name: string;
  hex: string;
  finish: Finish;
}

export const PAINTS: readonly FixturePaint[] = [
  { label: 'Solid', name: 'Fixture Solid', hex: '#b5262b', finish: 'solid' },
  { label: 'Metallic', name: 'Fixture Metallic', hex: '#2a5d9f', finish: 'metallic' },
  { label: 'Pearl', name: 'Fixture Pearl', hex: '#e8e2d6', finish: 'pearl' },
  { label: 'Frozen', name: 'Fixture Frozen', hex: '#7a8189', finish: 'frozen' },
  { label: 'Near black', name: 'Fixture Near Black', hex: '#0d1a2e', finish: 'metallic' },
  { label: 'Near white', name: 'Fixture Near White', hex: '#d8d4cc', finish: 'solid' },
  { label: 'Longest catalog name', name: LONGEST_NAME, hex: getColorHex(LONGEST_NAME), finish: 'metallic' },
  { label: 'Not in the catalog', name: UNLISTED_NAME, hex: getColorHex(UNLISTED_NAME), finish: 'solid' },
];
