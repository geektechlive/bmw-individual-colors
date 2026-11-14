import type { CSSProperties } from 'react';

/**
 * Per-item values (a paint's hex, a bar's width) go to CSS as custom properties, so the
 * styling itself stays in CSS Modules. React's CSSProperties type doesn't model custom
 * properties, which is why this helper exists.
 *
 *   <i className={styles.bar} style={cssVars({ '--w': `${pct}%`, '--p': hex })} />
 */
export function cssVars(vars: Record<`--${string}`, string | number>): CSSProperties {
  return vars as CSSProperties;
}
