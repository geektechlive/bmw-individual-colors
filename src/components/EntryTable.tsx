'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getColorHex, colorToSlug } from '../lib/colors';
import FlagButton from './FlagButton';
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
  const [filters, setFilters] = useState<{
    bodyStyle: string[];
    drivetrain: string[];
    transmission: string[];
    competition: boolean | null;
  }>({ bodyStyle: [], drivetrain: [], transmission: [], competition: null });

  function toggleArrayFilter(key: 'bodyStyle' | 'drivetrain' | 'transmission', value: string) {
    setFilters((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  }

  function toggleCompetition() {
    setFilters((prev) => {
      if (prev.competition === null) return { ...prev, competition: true };
      if (prev.competition === true) return { ...prev, competition: false };
      return { ...prev, competition: null };
    });
  }

  const filtered = entries.filter((e) => {
    if (filters.bodyStyle.length && !filters.bodyStyle.includes(e.body_style)) return false;
    if (filters.drivetrain.length && !filters.drivetrain.includes(e.drivetrain)) return false;
    if (filters.transmission.length && !filters.transmission.includes(e.transmission)) return false;
    if (filters.competition !== null && e.competition !== filters.competition) return false;
    const q = filter.toLowerCase();
    if (q) {
      const matches =
        e.ext_color.toLowerCase().includes(q) ||
        (e.forum_username ?? '').toLowerCase().includes(q) ||
        (e.location_state ?? '').toLowerCase().includes(q) ||
        (e.interior_color ?? '').toLowerCase().includes(q) ||
        (e.body_style ?? '').toLowerCase().includes(q) ||
        (e.drivetrain ?? '').toLowerCase().includes(q) ||
        (e.transmission ?? '').toLowerCase().includes(q) ||
        (e.wheels ?? '').toLowerCase().includes(q) ||
        (e.location_country ?? '').toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

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

  const chipActive: React.CSSProperties = {
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid #1C69D4',
    background: 'rgba(28,105,212,0.2)',
    color: '#e2e8f0',
  };

  const chipInactive: React.CSSProperties = {
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid #2d3f55',
    background: '#1e2a3a',
    color: '#94a3b8',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#64748b',
    alignSelf: 'center',
  };

  return (
    <div>
      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <span style={labelStyle}>Body:</span>
        {['M3', 'M4'].map((v) => (
          <button
            key={v}
            onClick={() => toggleArrayFilter('bodyStyle', v)}
            style={filters.bodyStyle.includes(v) ? chipActive : chipInactive}
          >
            {v}
          </button>
        ))}
        <span style={{ ...labelStyle, marginLeft: 4 }}>Drive:</span>
        {['RWD', 'AWD'].map((v) => (
          <button
            key={v}
            onClick={() => toggleArrayFilter('drivetrain', v)}
            style={filters.drivetrain.includes(v) ? chipActive : chipInactive}
          >
            {v}
          </button>
        ))}
        <span style={{ ...labelStyle, marginLeft: 4 }}>Trans:</span>
        {['DCT', '6MT'].map((v) => (
          <button
            key={v}
            onClick={() => toggleArrayFilter('transmission', v)}
            style={filters.transmission.includes(v) ? chipActive : chipInactive}
          >
            {v}
          </button>
        ))}
        <button
          onClick={toggleCompetition}
          style={filters.competition === true ? chipActive : chipInactive}
        >
          Comp
        </button>
      </div>

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
              <th style={{ ...thStyle, cursor: 'default', width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={10}
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
              const model = `${e.body_style}${e.competition ? ' Comp' : ''}`;

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
                      <Link href={`/colors/${colorToSlug(e.ext_color)}`} style={{ color: '#e2e8f0', textDecoration: 'none' }}>
                        {e.ext_color}
                      </Link>
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
                  <td style={{ ...tdStyle, color: '#64748b' }}>
                    {e.source_forum ? (
                      <span style={{ color: '#475569' }}>[{e.source_forum}]{' '}</span>
                    ) : null}
                    {e.forum_username ?? ''}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', padding: '6px 4px' }}>
                    <FlagButton id={e.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
