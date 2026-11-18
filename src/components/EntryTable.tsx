'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import IntentLink from './IntentLink';
import { getColorHex, colorToSlug } from '../lib/colors';
import { cityState as formatCityState, forumTagLabel, interiorDetail, modelLabel } from '../lib/entry-display';
import { SORT_CHOICES, choiceById, choiceFor, type SortDir, type SortKey } from '../lib/entry-sort';
import EntryPhoneRow from './EntryPhoneRow';
import RowActions from './RowActions';
import PaintSwatch from './PaintSwatch';
import table from './BuildTable.module.css';
import styles from './EntryTable.module.css';
import type { BmwEntry } from '../types';

interface Props {
  entries: BmwEntry[];
}

type ArrayFilter = 'bodyStyle' | 'drivetrain' | 'transmission';

const PAGE_SIZE = 50;
const NUMERIC_SORT_KEYS: SortKey[] = ['model_year'];

// The filter groups, in order. Comp is a model, so it sits with M3 and M4.
const FILTER_GROUPS: { label: string; chips: { value: string; filter: ArrayFilter | 'competition' }[] }[] = [
  {
    label: 'Model',
    chips: [
      { value: 'M3', filter: 'bodyStyle' },
      { value: 'M4', filter: 'bodyStyle' },
      { value: 'Comp', filter: 'competition' },
    ],
  },
  {
    label: 'Drive',
    chips: [
      { value: 'RWD', filter: 'drivetrain' },
      { value: 'AWD', filter: 'drivetrain' },
    ],
  },
  {
    label: 'Trans',
    chips: [
      { value: '8AT', filter: 'transmission' },
      { value: '6MT', filter: 'transmission' },
    ],
  },
];

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
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  // Builds reported this visit, shared by the table and the phone rows and kept across pages.
  const [reported, setReported] = useState<ReadonlySet<string>>(new Set());
  const markReported = (id: string) => setReported((prev) => new Set(prev).add(id));
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

  function toggleArrayFilter(key: ArrayFilter, value: string) {
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
    // Two states: Comp only, or all. The chip is pressed exactly when the filter is on (#77).
    setFilters((prev) => ({ ...prev, competition: prev.competition === true ? null : true }));
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

  function handleSortSelect(id: string) {
    const choice = choiceById(id);
    if (!choice) return;
    setSortKey(choice.key);
    setSortDir(choice.dir);
    resetPage();
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const ariaSort = (key: SortKey): React.AriaAttributes['aria-sort'] =>
    sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

  const pageBtnClass = (active: boolean) =>
    active ? `${styles.pageBtn} ${styles.pageBtnActive}` : styles.pageBtn;

  const sortHeader = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={ariaSort(key)}>
      <button type="button" className={styles.sortBtn} onClick={() => handleSort(key)}>
        {label}
        {arrow(key)}
      </button>
    </th>
  );

  const chipPressed = (filter: ArrayFilter | 'competition', value: string) =>
    filter === 'competition' ? filters.competition === true : filters[filter].includes(value);

  const choice = choiceFor(sortKey, sortDir);
  const sortOptions = SORT_CHOICES.some((c) => c.id === choice.id) ? SORT_CHOICES : [...SORT_CHOICES, choice];

  return (
    <div>
      {/* Filters: Model, Drive, Trans. One sideways-scrolling row on phones. */}
      <div className={styles.controls}>
      <div role="group" aria-label="Filter builds" className={styles.filters}>
        {FILTER_GROUPS.map((group) => (
          <span key={group.label} data-filter-group={group.label} className={styles.fgroup}>
            <span className={`label ${styles.fgroupLabel}`}>{group.label}</span>
            {group.chips.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => (c.filter === 'competition' ? toggleCompetition() : toggleArrayFilter(c.filter, c.value))}
                className="chip"
                aria-pressed={chipPressed(c.filter, c.value)}
              >
                {c.value}
              </button>
            ))}
          </span>
        ))}
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
        <span className={`num ${styles.summary} ${styles.countDesktop}`}>
          {totalCount === 0
            ? 'No entries'
            : `Showing ${startIdx + 1}–${endIdx} of ${totalCount} ${totalCount === 1 ? 'entry' : 'entries'}`}
        </span>
      </div>

      </div>

      <div className={styles.phoneBar}>
        <span className={`num ${styles.summary}`}>
          {totalCount === 0 ? 'No entries' : `${startIdx + 1}–${endIdx} of ${totalCount}`}
        </span>
        <label className={styles.sortSel}>
          <span className="label">Sort</span>
          <span>{choice.label}</span>
          <select
            aria-label="Sort builds"
            className={styles.sortNative}
            value={choice.id}
            onChange={(e) => handleSortSelect(e.target.value)}
          >
            {sortOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.cardView}>
        {pageEntries.length === 0 ? (
          <p className={styles.empty}>No entries found.</p>
        ) : (
          <ul className={styles.rows} aria-label="Builds">
            {pageEntries.map((e) => (
              <EntryPhoneRow key={e.id} entry={e} reported={reported.has(e.id)} onReported={() => markReported(e.id)} />
            ))}
          </ul>
        )}
      </div>

      <div className={`${table.wrap} ${styles.tableView}`}>
        <table className={`${table.table} ${styles.bs}`}>
          <thead>
            <tr>
              {sortHeader('ext_color', 'Color')}
              {sortHeader('model_year', 'Year')}
              {sortHeader('body_style', 'Model')}
              {sortHeader('drivetrain', 'Drive')}
              <th scope="col">Trans</th>
              {sortHeader('interior_color', 'Interior')}
              <th scope="col">Wheels</th>
              {sortHeader('location_state', 'Location')}
              {sortHeader('forum_username', 'Forum User')}
              <th scope="col">
                <span className="sr-only">Edit or report</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={10} className={styles.tdEmpty}>
                  No entries found.
                </td>
              </tr>
            )}
            {pageEntries.map((e) => {
              const place = formatCityState(e);
              const detail = interiorDetail(e);
              const tag = forumTagLabel(e.source_forum);

              return (
                <tr key={e.id}>
                  <td>
                    <span className={table.paintCell}>
                      <PaintSwatch name={e.ext_color} hex={getColorHex(e.ext_color)} />
                      <IntentLink
                        href={`/colors/${colorToSlug(e.ext_color)}`}
                        className={`${table.paintLink} paint-name ${styles.paintLink}`}
                      >
                        {e.ext_color}
                      </IntentLink>
                    </span>
                  </td>
                  <td className={styles.year}>{e.model_year}</td>
                  <td>{modelLabel(e)}</td>
                  <td>{e.drivetrain}</td>
                  <td>{e.transmission}</td>
                  <td>
                    <span className={styles.two}>
                      <span>{e.interior_color ?? ''}</span>
                      {detail ? <span className={styles.detail}>{detail}</span> : null}
                    </span>
                  </td>
                  <td>{e.wheels ?? ''}</td>
                  <td>
                    <span className={styles.two}>
                      <span>{place || e.location_country || ''}</span>
                      {place && e.location_country ? <span className={styles.detail}>{e.location_country}</span> : null}
                    </span>
                  </td>
                  <td>
                    {tag ? <span className={styles.forumTag}>{tag}</span> : null}
                    {e.forum_username ?? ''}
                  </td>
                  <td className={styles.act}>
                    <RowActions id={e.id} reported={reported.has(e.id)} onReported={() => markReported(e.id)} />
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
            Previous
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
