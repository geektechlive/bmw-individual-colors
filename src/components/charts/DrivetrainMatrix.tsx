'use client';

import type { BmwEntry } from '../../types';
import { cssVars } from '../../lib/css-vars';
import { DRIVETRAIN_TILE_VARS } from './palette';
import styles from './DrivetrainMatrix.module.css';

interface Props {
  entries: BmwEntry[];
}

const tiles = [
  { key: 'RWD+6MT', label: 'RWD · Manual', sub: '6MT' },
  { key: 'RWD+8AT', label: 'RWD · Auto', sub: '8AT' },
  { key: 'AWD+6MT', label: 'AWD · Manual', sub: 'xDrive 6MT' },
  { key: 'AWD+8AT', label: 'AWD · Auto', sub: 'xDrive 8AT' },
];

export default function DrivetrainMatrix({ entries }: Props) {
  const combos: Record<string, number> = {
    'RWD+6MT': 0,
    'RWD+8AT': 0,
    'AWD+6MT': 0,
    'AWD+8AT': 0,
  };

  for (const e of entries) {
    const key = `${e.drivetrain}+${e.transmission}`;
    if (key in combos) combos[key]++;
  }

  const total = entries.length;

  return (
    <div className={styles.grid}>
      {tiles.map((tile) => {
        const count = combos[tile.key];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div
            key={tile.key}
            className={styles.tile}
            style={cssVars({ '--tile': DRIVETRAIN_TILE_VARS[tile.key] })}
          >
            <div className={`${styles.count} num`}>{count}</div>
            <div className={styles.label}>{tile.label}</div>
            <div className={styles.sub}>{tile.sub}</div>
            <div className={styles.pct}>{pct}% of all builds</div>
          </div>
        );
      })}
    </div>
  );
}
