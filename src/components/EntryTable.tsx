'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getColorHex, colorToSlug } from '../lib/colors';
import FlagButton from './FlagButton';
import PaintSwatch from './PaintSwatch';
import styles from './EntryTable.module.css';
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


  const pageBtnClass = (active: boolean) =>
    active ? `${styles.pageBtn} ${styles.pageBtnActive}` : styles.pageBtn;

  const sortHeader = (key: SortKey, label: string) => (
    <th className={styles.th} aria-sort={ariaSort(key)}>
      <button type="button" className={styles.sortBtn} onClick={() => handleSort(key)}>
        {label}
        {arrow(key)}
      </button>
    </th>
  );

  return (
    <div>
      {/* Filter chips */}
      <div className={styles.chips}>
        <span className={styles.chipLabel}>Body:</span>
        {['M3', 'M4'].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggleArrayFilter('bodyStyle', v)}
            className="chip"
            aria-pressed={filters.bodyStyle.includes(v)}
          >
            {v}
          </button>
        ))}
        <span className={`${styles.chipLabel} ${styles.chipLabelGap}`}>Drive:</span>
        {['RWD', 'AWD'].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggleArrayFilter('drivetrain', v)}
            className="chip"
            aria-pressed={filters.drivetrain.includes(v)}
          >
            {v}
          </button>
        ))}
        <span className={`${styles.chipLabel} ${styles.chipLabelGap}`}>Trans:</span>
        {['8AT', '6MT'].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggleArrayFilter('transmission', v)}
            className="chip"
            aria-pressed={filters.transmission.includes(v)}
          >
            {v}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleCompetition}
          className="chip"
          aria-pressed={filters.competition === true}
        >
          Comp
        </button>
      </div>

      <div className={styles.search}>
        <input
          type="text"
          placeholder="Filter by color, interior, state, username..."
          aria-label="Filter entries"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            resetPage();
          }}
          className={`input ${styles.searchInput}`}
        />
        <span className={`num ${styles.summary}`}>
          {totalCount === 0
            ? 'No entries'
            : `Showing ${startIdx + 1}–${endIdx} of ${totalCount} ${totalCount === 1 ? 'entry' : 'entries'}`}
        </span>
      </div>

      <div className="scroll-x">
        <table className={styles.table}>
          <thead>
            <tr className={styles.headRow}>
              {sortHeader('ext_color', 'Color')}
              {sortHeader('model_year', 'Year')}
              {sortHeader('body_style', 'Model')}
              {sortHeader('drivetrain', 'Drive')}
              <th className={`${styles.th} ${styles.thPlain}`}>Trans</th>
              {sortHeader('interior_color', 'Interior')}
              <th className={`${styles.th} ${styles.thPlain}`}>Wheels</th>
              {sortHeader('location_state', 'Location')}
              {sortHeader('forum_username', 'Forum User')}
              <th className={`${styles.th} ${styles.thPlain} ${styles.thFlag}`}></th>
              <th className={`${styles.th} ${styles.thPlain} ${styles.thEdit}`}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={11} className={`${styles.td} ${styles.tdEmpty}`}>
                  No entries found.
                </td>
              </tr>
            )}
            {pageEntries.map((e) => {
              const hex = getColorHex(e.ext_color);
              const cityState = [e.location_city, e.location_state].filter(Boolean).join(', ');
              const model = `${e.body_style}${e.competition ? ' Comp' : ''}`;

              return (
                <tr key={e.id} className={styles.row}>
                  <td className={styles.td}>
                    <div className={styles.colorCell}>
                      <PaintSwatch name={e.ext_color} hex={hex} />
                      <Link
                        href={`/colors/${colorToSlug(e.ext_color)}`}
                        className={`paint-name ${styles.colorLink}`}
                      >
                        {e.ext_color}
                      </Link>
                    </div>
                  </td>
                  <td className={`${styles.td} mono`}>{e.model_year}</td>
                  <td className={styles.td}>{model}</td>
                  <td className={styles.td}>{e.drivetrain}</td>
                  <td className={styles.td}>{e.transmission}</td>
                  <td className={styles.td}>
                    {e.interior_color && (
                      <span>
                        {e.interior_color}
                        {(e.interior_seats || e.interior_leather) ? (
                          <span className={styles.interiorDetail}>
                            ({[e.interior_seats, e.interior_leather ? `${e.interior_leather} Leather` : null].filter(Boolean).join(', ')})
                          </span>
                        ) : e.interior_type ? (
                          <span className={styles.interiorDetail}>
                            ({e.interior_type})
                          </span>
                        ) : null}
                      </span>
                    )}
                  </td>
                  <td className={`${styles.td} ${styles.wheels}`}>{e.wheels ?? ''}</td>
                  <td className={styles.td}>
                    {cityState && <span className={styles.city}>{cityState}</span>}
                    {e.location_country && (
                      <span className={cityState ? `${styles.country} ${styles.countryGap}` : styles.country}>
                        {e.location_country}
                      </span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {e.source_forum ? (
                      <span className={styles.forumTag}>{e.source_forum}</span>
                    ) : null}
                    <span className={styles.username}>{e.forum_username ?? ''}</span>
                  </td>
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <FlagButton id={e.id} />
                  </td>
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    {/* No prefetch: /edit bypasses the edge cache, so prefetching one
                        per visible row fired bursts of full renders that tripped the
                        Workers Free CPU limit. Edits are rare; load on click. */}
                    <Link
                      href={`/edit/${e.id}`}
                      prefetch={false}
                      className={styles.editLink}
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
        <nav aria-label="Pagination" className={styles.pagination}>
          <button
            type="button"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className={pageBtnClass(false)}
          >
            Prev
          </button>
          {getPageNumbers(currentPage, totalPages).map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className={styles.ellipsis}>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === currentPage ? 'page' : undefined}
                className={pageBtnClass(p === currentPage)}
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
            className={pageBtnClass(false)}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}

