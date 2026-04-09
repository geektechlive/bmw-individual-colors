'use client';

import type { BmwEntry } from '../../types';
import { getColorHex } from '../../lib/colors';

interface Props {
  entries: BmwEntry[];
}

export default function ColorInteriorMatrix({ entries }: Props) {
  if (entries.length === 0) {
    return <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No data yet.</p>;
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
    return <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No interior color data yet.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 12, whiteSpace: 'nowrap' }}>
        <thead>
          <tr style={{ background: '#1e2a3a' }}>
            <th
              style={{
                padding: '8px 12px',
                textAlign: 'left',
                color: '#94a3b8',
                border: '1px solid #2d3f55',
                fontWeight: 600,
                minWidth: 160,
              }}
            >
              Ext \ Interior
            </th>
            {top8Int.map((ic) => (
              <th
                key={ic}
                style={{
                  padding: '8px 10px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  border: '1px solid #2d3f55',
                  fontWeight: 600,
                  minWidth: 80,
                  maxWidth: 100,
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                }}
              >
                {ic}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {top15Ext.map((ext, ri) => (
            <tr key={ext} style={{ background: ri % 2 === 0 ? '#0f1923' : '#131e2b' }}>
              <td
                style={{
                  padding: '6px 12px',
                  border: '1px solid #2d3f55',
                  color: '#e2e8f0',
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: getColorHex(ext),
                    marginRight: 6,
                    verticalAlign: 'middle',
                    border: '1px solid #374151',
                  }}
                />
                {ext}
              </td>
              {top8Int.map((int) => {
                const val = matrix[ext][int];
                const opacity = val > 0 ? 0.15 + (val / maxVal) * 0.75 : 0;
                return (
                  <td
                    key={int}
                    style={{
                      padding: '6px 10px',
                      textAlign: 'center',
                      border: '1px solid #2d3f55',
                      background: val > 0 ? `rgba(28,105,212,${opacity})` : 'transparent',
                      color: val > 0 ? '#e2e8f0' : '#374151',
                      fontWeight: val > 0 ? 600 : 400,
                    }}
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
