// Color tokens for code that can't read CSS variables: Recharts and Leaflet draw SVG
// attributes, where var() doesn't resolve. Values must match src/styles/tokens.css
// (tests/unit/design-tokens.test.ts checks both, plus every text-on-surface pair).
// Spec: docs/design/2026-11-refresh.md. ADR 0016.

export const TOKENS = {
  // Ground and surfaces
  'bg': '#0b0d10',
  'panel': '#12151a',
  'panel-2': '#181c22',
  'panel-3': '#20252d',
  // Lines (MARK-ONLY: never text)
  'rule': '#262b33',
  'rule-strong': '#3a414c',
  // Text
  'ink': '#eceef1',
  'ink-2': '#a9b0ba',
  'ink-3': '#8b939e',
  // Accent (fill and marks) and its readable text form
  'accent': '#1c69d4',
  'accent-ink': '#6aa6ff',
  'on-accent': '#ffffff',
  'focus': '#6aa6ff',
  // M stripe (MARK-ONLY)
  'm-blue': '#1c69d4',
  'm-violet': '#6f2da8',
  'm-red': '#e8002d',
  // Status: a fill (MARK-ONLY) and a readable text form each
  'danger': '#dc2626',
  'danger-ink': '#f87171',
  'warn': '#ca8a04',
  'warn-ink': '#fde047',
  'ok': '#16a34a',
  'ok-ink': '#4ade80',
} as const;

export type TokenName = keyof typeof TOKENS;

export const MIN_TEXT_CONTRAST = 4.5;

/** The status washes used behind text, as alpha over a surface. Mirrors tokens.css. */
export const WASH_ALPHA = 0.16;

interface TextPair {
  text: TokenName;
  surface: TokenName;
  /** When set, `surface` is a translucent wash at `alpha` laid over this opaque token. */
  over?: TokenName;
  alpha?: number;
}

const TEXT_INKS: TokenName[] = ['ink', 'ink-2', 'ink-3', 'accent-ink'];
const OPAQUE_SURFACES: TokenName[] = ['bg', 'panel', 'panel-2', 'panel-3'];

/** Every text color allowed on every surface it is allowed on. */
export const TEXT_PAIRS: TextPair[] = [
  ...TEXT_INKS.flatMap((text) => OPAQUE_SURFACES.map((surface) => ({ text, surface }))),
  { text: 'on-accent', surface: 'accent' },
  // Status text sits on its own wash, laid over a panel or the page.
  ...(['danger', 'warn', 'ok'] as const).flatMap((status) =>
    (['bg', 'panel'] as const).flatMap((over) => [
      { text: `${status}-ink` as TokenName, surface: status as TokenName, over, alpha: WASH_ALPHA },
      { text: 'ink' as TokenName, surface: status as TokenName, over, alpha: WASH_ALPHA },
    ]),
  ),
  // Accent wash behind accent-ink and ink (chips, selected rows).
  { text: 'accent-ink', surface: 'accent', over: 'panel', alpha: WASH_ALPHA },
  { text: 'ink', surface: 'accent', over: 'panel', alpha: WASH_ALPHA },
];
