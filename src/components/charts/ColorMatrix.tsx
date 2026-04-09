'use client';

import type { MatrixData } from '../../lib/queries';

interface Props {
  data: MatrixData;
}

export default function ColorMatrix({ data }: Props) {
  const { columns, rows, columnTotals, grandTotal } = data;

  if (rows.length === 0) {
    return <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No data yet.</p>;
  }

  return (
    <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap', width: '100%' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <tr style={{ background: '#1e2a3a' }}>
            <th
              style={{
                padding: '8px 12px',
                textAlign: 'left',
                color: '#94a3b8',
                border: '1px solid #2d3f55',
                position: 'sticky',
                left: 0,
                background: '#1e2a3a',
                zIndex: 11,
                fontWeight: 600,
              }}
            >
              Color
            </th>
            {columns.map((col) => (
              <th
                key={col}
                style={{
                  padding: '8px 10px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  border: '1px solid #2d3f55',
                  fontWeight: 600,
                  minWidth: 80,
                }}
              >
                {col}
              </th>
            ))}
            <th
              style={{
                padding: '8px 10px',
                textAlign: 'center',
                color: '#1C69D4',
                border: '1px solid #2d3f55',
                fontWeight: 700,
                minWidth: 60,
              }}
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.color} style={{ background: ri % 2 === 0 ? '#0f1923' : '#131e2b' }}>
              <td
                style={{
                  padding: '6px 12px',
                  border: '1px solid #2d3f55',
                  color: '#e2e8f0',
                  fontWeight: 500,
                  position: 'sticky',
                  left: 0,
                  background: ri % 2 === 0 ? '#0f1923' : '#131e2b',
                  zIndex: 1,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: row.hex,
                    marginRight: 6,
                    verticalAlign: 'middle',
                    border: '1px solid #374151',
                  }}
                />
                {row.color}
              </td>
              {columns.map((col) => {
                const val = row.cells[col] ?? 0;
                return (
                  <td
                    key={col}
                    style={{
                      padding: '6px 10px',
                      textAlign: 'center',
                      border: '1px solid #2d3f55',
                      color: val > 0 ? '#e2e8f0' : '#374151',
                      background: val > 0 ? 'rgba(28,105,212,0.18)' : 'transparent',
                      fontWeight: val > 0 ? 600 : 400,
                    }}
                  >
                    {val > 0 ? val : ''}
                  </td>
                );
              })}
              <td
                style={{
                  padding: '6px 10px',
                  textAlign: 'center',
                  border: '1px solid #2d3f55',
                  color: '#1C69D4',
                  fontWeight: 700,
                }}
              >
                {row.total}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#1e2a3a' }}>
            <td
              style={{
                padding: '8px 12px',
                border: '1px solid #2d3f55',
                color: '#1C69D4',
                fontWeight: 700,
                position: 'sticky',
                left: 0,
                background: '#1e2a3a',
                zIndex: 1,
              }}
            >
              Total
            </td>
            {columns.map((col) => (
              <td
                key={col}
                style={{
                  padding: '8px 10px',
                  textAlign: 'center',
                  border: '1px solid #2d3f55',
                  color: '#1C69D4',
                  fontWeight: 700,
                }}
              >
                {columnTotals[col] ?? 0}
              </td>
            ))}
            <td
              style={{
                padding: '8px 10px',
                textAlign: 'center',
                border: '1px solid #2d3f55',
                color: '#ffffff',
                fontWeight: 700,
                background: '#1C69D4',
              }}
            >
              {grandTotal}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
