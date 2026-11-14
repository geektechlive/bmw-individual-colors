'use client';

import type { MatrixData } from '../../lib/analytics';
import { cssVars } from '../../lib/css-vars';
import shared from './charts.module.css';
import styles from './ColorMatrix.module.css';

interface Props {
  data: MatrixData;
}

export default function ColorMatrix({ data }: Props) {
  const { columns, rows, columnTotals, grandTotal } = data;

  if (rows.length === 0) {
    return <p className={shared.empty}>No data yet.</p>;
  }

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr className={styles.headRow}>
            <th className={styles.thCorner}>Color</th>
            {columns.map((col) => {
              const parts = col.split(' ');
              const year = parts[0];
              const modelDrive = parts.slice(1).join(' ')
                .replace(/C AWD/, ' Comp AWD')
                .replace(/C RWD/, ' Comp RWD')
                .replace(/C$/, ' Comp');
              return (
                <th key={col} className={styles.thCol}>
                  <span className={styles.thYear}>{year}</span>
                  <span className={styles.thSub}>{modelDrive}</span>
                </th>
              );
            })}
            <th className={styles.thTotal}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.color} className={styles.row}>
              <td className={styles.tdColor}>
                <span className={shared.swatch} style={cssVars({ '--p': row.hex })} />
                {row.color}
              </td>
              {columns.map((col) => {
                const val = row.cells[col] ?? 0;
                return (
                  <td key={col} className={`${styles.cell} ${val > 0 ? styles.cellHit : ''}`}>
                    {val > 0 ? val : ''}
                  </td>
                );
              })}
              <td className={styles.tdRowTotal}>{row.total}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={styles.footRow}>
            <td className={styles.tfColor}>Total</td>
            {columns.map((col) => (
              <td key={col} className={styles.tfCol}>
                {columnTotals[col] ?? 0}
              </td>
            ))}
            <td className={styles.tfGrand}>{grandTotal}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
