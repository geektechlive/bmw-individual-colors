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

export const WHEEL_PALETTE = [TOKENS['ink-2'], TOKENS['ink-3'], TOKENS['rule-strong']];

export const FALLBACK_PAINT = TOKENS['ink-3'];
