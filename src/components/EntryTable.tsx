'use client';

import { useState } from 'react';
import { getColorHex } from '../lib/colors';
import type { BmwEntry } from '../types';

interface Props {
  entries: BmwEntry[];
}

type SortKey = keyof Pick<
  BmwEntry,
  'ext_color' | 'model_year' | 'body_style' | 'drivetrain' | 'interior_color' | 'location_state' | 'forum_username'
>;

export default function EntryTable({ entries }: Props) {
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('model_year');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = entries.filter((e) =>
    e.ext_color.toLowerCase().includes(filter.toLowerCase()) ||
    (e.forum_username ?? '').toLowerCase().includes(filter.toLowerCase()) ||
    (e.location_state ?? '').toLowerCase().includes(filter.toLowerCase()) ||
    (e.interior_color ?? '').toLowerCase().includes(filter.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sortKey] ?? '') as string | number;
    const bv = (b[sortKey] ?? '') as string | number;
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    color: '#94a3b8',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    border: '1px solid #2d3f55',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    background: '#1e2a3a',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    border: '1px solid #2d3f55',
    color: '#e2e8f0',
    fontSize: 13,
    verticalAlign: 'middle',
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Filter by color, interior, state, username..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 420,
            padding: '8px 12px',
            background: '#1e2a3a',
            border: '1px solid #2d3f55',
            borderRadius: 6,
            color: '#e2e8f0',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <span style={{ marginLeft: 12, color: '#64748b', fontSize: 13 }}>
          {sorted.length} {sorted.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle} onClick={() => handleSort('ext_color')}>
                Color{arrow('ext_color')}
              </th>
              <th style={thStyle} onClick={() => handleSort('model_year')}>
                Year{arrow('model_year')}
              </th>
              <th style={thStyle} onClick={() => handleSort('body_style')}>
                Model{arrow('body_style')}
              </th>
              <th style={thStyle} onClick={() => handleSort('drivetrain')}>
                Drive{arrow('drivetrain')}
              </th>
              <th style={{ ...thStyle, cursor: 'default' }}>Trans</th>
              <th style={thStyle} onClick={() => handleSort('interior_color')}>
                Interior{arrow('interior_color')}
              </th>
              <th style={{ ...thStyle, cursor: 'default' }}>Wheels</th>
              <th style={thStyle} onClick={() => handleSort('location_state')}>
                Location{arrow('location_state')}
              </th>
              <th style={thStyle} onClick={() => handleSort('forum_username')}>
                Forum User{arrow('forum_username')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{ ...tdStyle, textAlign: 'center', color: '#64748b', padding: '2rem' }}
                >
                  No entries found.
                </td>
              </tr>
            )}
            {sorted.map((e, i) => {
              const hex = getColorHex(e.ext_color);
              const location = [e.location_city, e.location_state, e.location_country]
                .filter(Boolean)
                .join(', ');
              const model = `${e.body_style}${e.competition ? ' Comp' : ''} ${e.drivetrain}`;

              return (
                <tr
                  key={e.id}
                  style={{ background: i % 2 === 0 ? '#0f1923' : '#131e2b' }}
                >
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: hex,
                          border: '1px solid #374151',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: '#e2e8f0' }}>{e.ext_color}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>{e.model_year}</td>
                  <td style={tdStyle}>{model}</td>
                  <td style={tdStyle}>{e.drivetrain}</td>
                  <td style={tdStyle}>{e.transmission}</td>
                  <td style={tdStyle}>
                    {e.interior_color && (
                      <span>
                        {e.interior_color}
                        {e.interior_type && (
                          <span style={{ color: '#64748b', fontSize: 11, marginLeft: 4 }}>
                            ({e.interior_type})
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: '#94a3b8' }}>{e.wheels ?? ''}</td>
                  <td style={{ ...tdStyle, color: '#94a3b8' }}>{location}</td>
                  <td style={{ ...tdStyle, color: '#64748b' }}>{e.forum_username ?? ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
