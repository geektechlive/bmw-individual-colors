'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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

const PAGE_SIZE = 50;
const NUMERIC_SORT_KEYS: SortKey[] = ['model_year'];

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, total, current]);
  if (current - 1 >= 1) pages.add(current - 1);
  if (current + 1 <= total) pages.add(current + 1);
  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const p of sortedPages) {
    if (prev && p - prev > 1) result.push('ellipsis');
    result.push(p);
    prev = p;
  }
  return result;
}

export default function EntryTable({ entries }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('model_year');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<{
    bodyStyle: string[];
    drivetrain: string[];
    transmission: string[];
    competition: boolean | null;
  }>({ bodyStyle: [], drivetrain: [], transmission: [], competition: null });

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const setPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next <= 1) {
        params.delete('page');
      } else {
        params.set('page', String(next));
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const resetPage = useCallback(() => setPage(1), [setPage]);

  function toggleArrayFilter(key: 'bodyStyle' | 'drivetrain' | 'transmission', value: string) {
    setFilters((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
    resetPage();
  }

  function toggleCompetition() {
    setFilters((prev) => {
      if (prev.competition === null) return { ...prev, competition: true };
      if (prev.competition === true) return { ...prev, competition: false };
      return { ...prev, competition: null };
    });
    resetPage();
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
    const rawA = a[sortKey];
    const rawB = b[sortKey];
    let cmp: number;
    if (NUMERIC_SORT_KEYS.includes(sortKey)) {
      const av = typeof rawA === 'number' ? rawA : -Infinity;
      const bv = typeof rawB === 'number' ? rawB : -Infinity;
      cmp = av - bv;
    } else {
      const av = (rawA ?? '') as string;
      const bv = (rawB ?? '') as string;
      cmp = av.localeCompare(bv);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, totalCount);
  const pageEntries = sorted.slice(startIdx, endIdx);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    resetPage();
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const ariaSort = (key: SortKey): React.AriaAttributes['aria-sort'] =>
    sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

  const thStyle: React.CSSProperties = {
    padding: 0,
    textAlign: 'left',
    color: '#b8c5d6',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    border: '1px solid #2d3f55',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    background: '#1e2a3a',
  };

  const thPlainStyle: React.CSSProperties = {
    ...thStyle,
    padding: '10px 12px',
  };

  const thButtonStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '10px 12px',
    margin: 0,
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    font: 'inherit',
    textTransform: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
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

  const pageBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: active ? '1px solid #1C69D4' : '1px solid #2d3f55',
    background: active ? 'rgba(28,105,212,0.2)' : '#1e2a3a',
    color: active ? '#e2e8f0' : '#94a3b8',
  });

  return (
    <div>
      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <span style={labelStyle}>Body:</span>
        {['M3', 'M4'].map((v) => (
          <button
            key={v}
            type="button"
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
            type="button"
            onClick={() => toggleArrayFilter('drivetrain', v)}
            style={filters.drivetrain.includes(v) ? chipActive : chipInactive}
          >
            {v}
          </button>
        ))}
        <span style={{ ...labelStyle, marginLeft: 4 }}>Trans:</span>
        {['8AT', '6MT'].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggleArrayFilter('transmission', v)}
            style={filters.transmission.includes(v) ? chipActive : chipInactive}
          >
            {v}
          </button>
        ))}
        <button
          type="button"
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
          aria-label="Filter entries"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            resetPage();
          }}
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
          {totalCount === 0
            ? 'No entries'
            : `Showing ${startIdx + 1}–${endIdx} of ${totalCount} ${totalCount === 1 ? 'entry' : 'entries'}`}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #1C69D4' }}>
              <th style={thStyle} aria-sort={ariaSort('ext_color')}>
                <button type="button" style={thButtonStyle} onClick={() => handleSort('ext_color')}>
                  Color{arrow('ext_color')}
                </button>
              </th>
              <th style={thStyle} aria-sort={ariaSort('model_year')}>
                <button type="button" style={thButtonStyle} onClick={() => handleSort('model_year')}>
                  Year{arrow('model_year')}
                </button>
              </th>
              <th style={thStyle} aria-sort={ariaSort('body_style')}>
                <button type="button" style={thButtonStyle} onClick={() => handleSort('body_style')}>
                  Model{arrow('body_style')}
                </button>
              </th>
              <th style={thStyle} aria-sort={ariaSort('drivetrain')}>
                <button type="button" style={thButtonStyle} onClick={() => handleSort('drivetrain')}>
                  Drive{arrow('drivetrain')}
                </button>
              </th>
              <th style={thPlainStyle}>Trans</th>
              <th style={thStyle} aria-sort={ariaSort('interior_color')}>
                <button type="button" style={thButtonStyle} onClick={() => handleSort('interior_color')}>
                  Interior{arrow('interior_color')}
                </button>
              </th>
              <th style={thPlainStyle}>Wheels</th>
              <th style={thStyle} aria-sort={ariaSort('location_state')}>
                <button type="button" style={thButtonStyle} onClick={() => handleSort('location_state')}>
                  Location{arrow('location_state')}
                </button>
              </th>
              <th style={thStyle} aria-sort={ariaSort('forum_username')}>
                <button type="button" style={thButtonStyle} onClick={() => handleSort('forum_username')}>
                  Forum User{arrow('forum_username')}
                </button>
              </th>
              <th style={{ ...thPlainStyle, width: 36 }}></th>
              <th style={{ ...thPlainStyle, width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  style={{ ...tdStyle, textAlign: 'center', color: '#64748b', padding: '2rem' }}
                >
                  No entries found.
                </td>
              </tr>
            )}
            {pageEntries.map((e, i) => {
              const hex = getColorHex(e.ext_color);
              const cityState = [e.location_city, e.location_state].filter(Boolean).join(', ');
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
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: hex,
                          border: '1px solid #374151',
                          flexShrink: 0,
                          boxShadow: `0 0 8px ${hex}55`,
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
                        {(e.interior_seats || e.interior_leather) ? (
                          <span style={{ color: '#7a8fa6', fontSize: 11, marginLeft: 4 }}>
                            ({[e.interior_seats, e.interior_leather ? `${e.interior_leather} Leather` : null].filter(Boolean).join(', ')})
                          </span>
                        ) : e.interior_type ? (
                          <span style={{ color: '#7a8fa6', fontSize: 11, marginLeft: 4 }}>
                            ({e.interior_type})
                          </span>
                        ) : null}
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: '#d4c9b8' }}>{e.wheels ?? ''}</td>
                  <td style={{ ...tdStyle }}>
                    {cityState && <span style={{ color: '#d4c9b8', fontSize: 13 }}>{cityState}</span>}
                    {e.location_country && (
                      <span style={{ color: '#8a9bb0', fontSize: 11, marginLeft: cityState ? 4 : 0 }}>
                        {e.location_country}
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle }}>
                    {e.source_forum ? (
                      <span style={{
                        display: 'inline-block',
                        background: '#1e2a3a',
                        border: '1px solid #2d3f55',
                        borderRadius: 4,
                        padding: '1px 5px',
                        fontSize: 10,
                        color: '#64748b',
                        marginRight: 5,
                        verticalAlign: 'middle',
                      }}>{e.source_forum}</span>
                    ) : null}
                    <span style={{ color: '#4d8fd4', fontWeight: 500 }}>{e.forum_username ?? ''}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', padding: '6px 4px' }}>
                    <FlagButton id={e.id} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', padding: '6px 4px' }}>
                    {/* No prefetch: /edit bypasses the edge cache, so prefetching one
                        per visible row fired bursts of full renders that tripped the
                        Workers Free CPU limit. Edits are rare; load on click. */}
                    <Link
                      href={`/edit/${e.id}`}
                      prefetch={false}
                      style={{ color: '#1C69D4', fontSize: 15, textDecoration: 'none', padding: 8, display: 'inline-block', lineHeight: 1 }}
                      title="Edit this entry"
                    >
                      ✏
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          style={{ display: 'flex', gap: 6, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <button
            type="button"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
            style={{ ...pageBtnStyle(false), opacity: currentPage === 1 ? 0.5 : 1 }}
          >
            Prev
          </button>
          {getPageNumbers(currentPage, totalPages).map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} style={{ color: '#64748b', padding: '0 4px' }}>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === currentPage ? 'page' : undefined}
                style={pageBtnStyle(p === currentPage)}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            style={{ ...pageBtnStyle(false), opacity: currentPage === totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
