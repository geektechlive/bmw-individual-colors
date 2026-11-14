'use client';

import Link from 'next/link';
import { useId, useMemo, useState, useSyncExternalStore } from 'react';
import PaintSwatch from '../PaintSwatch';
import { cssVars } from '../../lib/css-vars';
import {
  browseColors,
  parseSortHash,
  sortHash,
  type BrowseColor,
  type SortKey,
} from '../../lib/colors-browse';
import type { Finish } from '../../lib/paint-finish';
import styles from './ColorsBrowser.module.css';

const SORT_OPTIONS: ReadonlyArray<{ key: SortKey; label: string }> = [
  { key: 'builds', label: 'Most builds' },
  { key: 'color', label: 'By color' },
  { key: 'rarity', label: 'Rarest' },
  { key: 'name', label: 'Name' },
];

const FINISH_OPTIONS: ReadonlyArray<{ key: Finish; label: string }> = [
  { key: 'metallic', label: 'Metallic' },
  { key: 'pearl', label: 'Pearl' },
  { key: 'frozen', label: 'Frozen' },
  { key: 'solid', label: 'Solid' },
];

const FAMILY_ORDER = ['Reds & Oranges', 'Yellows', 'Greens', 'Blues', 'Purples', 'Greys & Blacks', 'Other'];

// The sort lives in the URL hash. replaceState fires no event, so changes are announced here.
const hashListeners = new Set<() => void>();
function subscribeToHash(listener: () => void) {
  hashListeners.add(listener);
  window.addEventListener('hashchange', listener);
  return () => {
    hashListeners.delete(listener);
    window.removeEventListener('hashchange', listener);
  };
}
const readHash = () => window.location.hash;
const serverHash = () => '';

interface ChipProps {
  label: string;
  pressed: boolean;
  onPress: () => void;
}

function Chip({ label, pressed, onPress }: ChipProps) {
  return (
    <button type="button" className="chip" aria-pressed={pressed} onClick={onPress}>
      {label}
    </button>
  );
}

export default function ColorsBrowser({ colors }: { colors: BrowseColor[] }) {
  const sort = parseSortHash(useSyncExternalStore(subscribeToHash, readHash, serverHash));
  const [family, setFamily] = useState<string | null>(null);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [query, setQuery] = useState('');
  const searchId = useId();

  const chooseSort = (next: SortKey) => {
    const url = window.location.pathname + window.location.search + sortHash(next);
    window.history.replaceState(null, '', url);
    hashListeners.forEach((l) => l());
  };

  const families = useMemo(
    () => FAMILY_ORDER.filter((f) => colors.some((c) => c.family === f)),
    [colors],
  );
  const visible = useMemo(
    () => browseColors(colors, { sort, family, finish, query }),
    [colors, sort, family, finish, query],
  );
  const clearFilters = () => {
    setFamily(null);
    setFinish(null);
    setQuery('');
  };

  return (
    <div>
      <div className={styles.controls}>
        <div className={styles.search}>
          <label htmlFor={searchId} className="label">Search by name</label>
          <input
            id={searchId}
            type="search"
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className={styles.chips} role="group" aria-label="Sort">
          {SORT_OPTIONS.map((o) => (
            <Chip key={o.key} label={o.label} pressed={sort === o.key} onPress={() => chooseSort(o.key)} />
          ))}
        </div>
        <div className={styles.chips} role="group" aria-label="Filter by color family">
          {families.map((f) => (
            <Chip key={f} label={f} pressed={family === f} onPress={() => setFamily(family === f ? null : f)} />
          ))}
        </div>
        <div className={styles.chips} role="group" aria-label="Filter by finish">
          {FINISH_OPTIONS.map((o) => (
            <Chip key={o.key} label={o.label} pressed={finish === o.key} onPress={() => setFinish(finish === o.key ? null : o.key)} />
          ))}
        </div>
      </div>

      <p className={`mono ${styles.count}`} aria-live="polite">
        {visible.length === colors.length
          ? `${colors.length} paints`
          : `${visible.length} of ${colors.length} paints`}
      </p>

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <p>No paints match those filters.</p>
          <button type="button" className="btn" onClick={clearFilters}>Clear filters</button>
        </div>
      ) : (
        <ul className={styles.grid}>
          {visible.map((c) => (
            <li key={c.slug}>
              <Link href={`/colors/${c.slug}`} className={styles.tile} style={cssVars({ '--p': c.hex })}>
                <PaintSwatch name={c.name} hex={c.hex} size="tile" />
                <span className={styles.meta}>
                  <span className={`paint-name ${styles.name}`}>{c.name}</span>
                  <span className={`mono ${styles.detail}`}>
                    {c.count} build{c.count === 1 ? '' : 's'} · {c.rarity}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
