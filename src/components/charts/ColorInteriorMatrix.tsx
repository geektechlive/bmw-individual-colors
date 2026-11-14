'use client';

import type { BmwEntry } from '../../types';
import { getColorHex } from '../../lib/colors';
import { cssVars } from '../../lib/css-vars';
import shared from './charts.module.css';
import styles from './ColorInteriorMatrix.module.css';

interface Props {
  entries: BmwEntry[];
}

export default function ColorInteriorMatrix({ entries }: Props) {
  if (entries.length === 0) {
    return <p className={shared.empty}>No data yet.</p>;
  }

  // Top 15 ext colors
  const extColorMap = new Map<string, number>();
  for (const e of entries) {
    extColorMap.set(e.ext_color, (extColorMap.get(e.ext_color) ?? 0) + 1);
  }
  const top15Ext = Array.from(extColorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([c]) => c);

  // Top 8 interior colors
  const intColorMap = new Map<string, number>();
  for (const e of entries) {
    const ic = e.interior_color?.trim();
    if (ic) intColorMap.set(ic, (intColorMap.get(ic) ?? 0) + 1);
  }
  const top8Int = Array.from(intColorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([c]) => c);

  // Build matrix
  const matrix: Record<string, Record<string, number>> = {};
  for (const ext of top15Ext) {
    matrix[ext] = {};
    for (const int of top8Int) {
      matrix[ext][int] = 0;
    }
  }
  for (const e of entries) {
    const ic = e.interior_color?.trim();
    if (top15Ext.includes(e.ext_color) && ic && top8Int.includes(ic)) {
      matrix[e.ext_color][ic] = (matrix[e.ext_color][ic] ?? 0) + 1;
    }
  }

  // Max value for opacity scaling
  const maxVal = Math.max(
    1,
    ...top15Ext.flatMap((ext) => top8Int.map((int) => matrix[ext][int]))
  );

  if (top8Int.length === 0) {
    return <p className={shared.empty}>No interior color data yet.</p>;
  }

  return (
    // Focusable so keyboard users can scroll it sideways (axe: scrollable-region-focusable).
    <div className={styles.scroll} tabIndex={0} role="region" aria-label="Color by interior table">
      <table className={styles.table}>
        <thead>
          <tr className={styles.headRow}>
            <th className={styles.thCorner}>Ext \ Interior</th>
            {top8Int.map((ic) => (
              <th key={ic} className={styles.thCol}>
                {ic}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {top15Ext.map((ext) => (
            <tr key={ext} className={styles.row}>
              <td className={styles.tdColor}>
                <span className={shared.swatch} style={cssVars({ '--p': getColorHex(ext) })} />
                {ext}
              </td>
              {top8Int.map((int) => {
                const val = matrix[ext][int];
                const heat = val > 0 ? 0.15 + (val / maxVal) * 0.75 : 0;
                return (
                  <td
                    key={int}
                    className={`${styles.cell} ${val > 0 ? styles.cellHit : ''}`}
                    style={val > 0 ? cssVars({ '--heat': heat }) : undefined}
                  >
                    {val > 0 ? val : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
