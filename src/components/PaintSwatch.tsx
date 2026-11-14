import { getColorHex } from '../lib/colors';
import { cssVars } from '../lib/css-vars';
import { getPaintFinish, type Finish } from '../lib/paint-finish';
import styles from './PaintSwatch.module.css';

export type SwatchSize = 'chip' | 'chip-sm' | 'tile' | 'panel' | 'fill';

interface Props {
  /** Paint name; sets the finish and, unless `hex` is given, the color. */
  name: string;
  hex?: string;
  size?: SwatchSize;
  /** Override the looked-up finish (the finish study, tests). */
  finish?: Finish;
  className?: string;
}

const SIZE_CLASS: Record<SwatchSize, string> = {
  chip: styles.chip,
  'chip-sm': `${styles.chip} ${styles.chipSm}`,
  tile: styles.tile,
  panel: styles.panel,
  fill: styles.fill,
};

/**
 * A paint swatch drawn in CSS (#44). Decorative: the paint name is always written next to
 * it, so it is hidden from assistive tech. Works in Server and Client Components.
 */
export default function PaintSwatch({ name, hex, size = 'chip', finish, className }: Props) {
  const f = finish ?? getPaintFinish(name);
  const lit = size === 'tile' || size === 'panel' || size === 'fill';
  const classes = [styles.paint, styles[f], SIZE_CLASS[size], lit ? styles.studio : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <span
      className={classes}
      style={cssVars({ '--p': hex ?? getColorHex(name) })}
      aria-hidden="true"
      data-finish={f}
    />
  );
}

/** Class names for places that build HTML strings (Leaflet markers). */
export function paintSwatchClassNames(name: string, size: SwatchSize = 'chip'): string {
  return [styles.paint, styles[getPaintFinish(name)], SIZE_CLASS[size]].join(' ');
}
