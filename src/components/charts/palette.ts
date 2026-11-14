import { TOKENS } from '../../lib/design-tokens';

// Shared Recharts chrome and categorical palettes. Recharts draws SVG attributes, where
// var() does not resolve, so marks use TOKENS hex values. Tooltip and legend wrappers
// render HTML, so they may use var() strings.

export const AXIS_TICK = { fill: TOKENS['ink-3'], fontSize: 12 } as const;
export const AXIS_TICK_LABEL = { fill: TOKENS['ink'], fontSize: 12 } as const;
export const AXIS_LINE = { stroke: TOKENS['rule-strong'] } as const;
export const GRID_STROKE = TOKENS['rule'];
export const SLICE_STROKE = TOKENS['panel'];
export const BAR_CURSOR = { fill: TOKENS['ink'], fillOpacity: 0.04 } as const;

export const TOOLTIP_STYLE = {
  background: 'var(--panel-2)',
  border: '1px solid var(--rule-strong)',
  borderRadius: 'var(--r)',
  color: 'var(--ink)',
  fontSize: 'var(--t-13)',
} as const;

export const LEGEND_WRAPPER_STYLE = { fontSize: 'var(--t-12)', color: 'var(--ink-2)' } as const;

// Pie series
export const MODEL_COLORS = [TOKENS['accent'], TOKENS['m-red']];
export const DRIVETRAIN_COLORS = [TOKENS['accent'], TOKENS['ok'], TOKENS['warn']];
export const TRANSMISSION_COLORS = [TOKENS['m-violet'], TOKENS['ink-2']];

// Drivetrain tiles: CSS custom property values (HTML, so var() works)
export const DRIVETRAIN_TILE_VARS: Record<string, string> = {
  'RWD+6MT': 'var(--m-red)',
  'RWD+8AT': 'var(--m-violet)',
  'AWD+6MT': 'var(--m-blue)',
  'AWD+8AT': 'var(--ok)',
};

export const FAMILY_COLORS: Record<string, string> = {
  Blues: TOKENS['accent'],
  Greens: TOKENS['ok'],
  'Reds & Oranges': TOKENS['m-red'],
  Yellows: TOKENS['warn'],
  Purples: TOKENS['m-violet'],
  'Greys & Blacks': TOKENS['ink-3'],
  Other: TOKENS['rule-strong'],
};

export const COMPETITION_COLORS = { M3: TOKENS['accent'], M4: TOKENS['m-violet'] } as const;

export const WHEEL_PALETTE = [TOKENS['ink-2'], TOKENS['ink-3'], TOKENS['rule-strong']];

export const OTHER_SLICE = TOKENS['rule-strong'];
export const FALLBACK_PAINT = TOKENS['ink-3'];
