'use client';

import type { BmwEntry } from '../../types';

interface Props {
  entries: BmwEntry[];
}

const tiles = [
  { key: 'RWD+6MT', label: 'RWD · Manual', color: '#E8002D', sub: '6MT' },
  { key: 'RWD+8AT', label: 'RWD · Auto', color: '#862086', sub: '8AT' },
  { key: 'AWD+6MT', label: 'AWD · Manual', color: '#1C69D4', sub: 'xDrive 6MT' },
  { key: 'AWD+8AT', label: 'AWD · Auto', color: '#2a7a5c', sub: 'xDrive 8AT' },
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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
      }}
    >
      {tiles.map((tile) => {
        const count = combos[tile.key];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div
            key={tile.key}
            style={{
              background: '#1e2a3a',
              border: '1px solid #2d3f55',
              borderLeft: `4px solid ${tile.color}`,
              borderRadius: 10,
              padding: '20px',
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: tile.color,
                lineHeight: 1,
                marginBottom: 6,
              }}
            >
              {count}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#e2e8f0',
                marginBottom: 4,
              }}
            >
              {tile.label}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {tile.sub}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: '#94a3b8',
              }}
            >
              {pct}% of all builds
            </div>
          </div>
        );
      })}
    </div>
  );
}
