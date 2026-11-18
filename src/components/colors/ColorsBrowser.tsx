'use client';

import IntentLink from '../IntentLink';
import { useId, useMemo, useState, useSyncExternalStore, ViewTransition } from 'react';
import PaintSwatch from '../PaintSwatch';
import { cssVars } from '../../lib/css-vars';
import {
  browseColors,
  parseSortHash,
  parseSortKey,
  sortHash,
  sortLabel,
  SORT_SELECT_ORDER,
  type BrowseColor,
  type SortKey,
} from '../../lib/colors-browse';
import type { Finish } from '../../lib/paint-finish';
import styles from './ColorsBrowser.module.css';

// Desktop chip order; the phone select has its own (SORT_SELECT_ORDER). Labels are shared.
const SORT_CHIP_ORDER: readonly SortKey[] = ['builds', 'color', 'rarity', 'name'];

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
            placeholder="Search paints, e.g. Frozen"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className={`${styles.chips} ${styles.sortChips}`} role="group" aria-label="Sort">
          {SORT_CHIP_ORDER.map((key) => (
            <Chip key={key} label={sortLabel(key)} pressed={sort === key} onPress={() => chooseSort(key)} />
          ))}
        </div>
        <div className={styles.bar}>
          <p className={`mono ${styles.count}`} aria-live="polite">
            {visible.length === colors.length
              ? `${colors.length} paints`
              : `${visible.length} of ${colors.length} paints`}
          </p>
          <label className={styles.sortSel}>
            <span className="label">Sort</span>
            <span>{sortLabel(sort)}</span>
            <select
              aria-label="Sort paints"
              className={styles.sortNative}
              value={sort}
              onChange={(e) => chooseSort(parseSortKey(e.target.value))}
            >
              {SORT_SELECT_ORDER.map((key) => (
                <option key={key} value={key}>{sortLabel(key)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.filters} role="group" aria-label="Filter by color family and finish">
          <div className={styles.chips}>
            {families.map((f) => (
              <Chip key={f} label={f} pressed={family === f} onPress={() => setFamily(family === f ? null : f)} />
            ))}
          </div>
          <span className={styles.sep} aria-hidden="true" />
          <div className={styles.chips}>
            {FINISH_OPTIONS.map((o) => (
              <Chip key={o.key} label={o.label} pressed={finish === o.key} onPress={() => setFinish(finish === o.key ? null : o.key)} />
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <p>No paints match those filters.</p>
          <button type="button" className="btn" onClick={clearFilters}>Clear filters</button>
        </div>
      ) : (
        <ul className={styles.grid}>
          {visible.map((c, i) => (
            <li key={c.slug} className="rise" style={cssVars({ '--i': i })}>
              <IntentLink href={`/colors/${c.slug}`} className={styles.tile} style={cssVars({ '--p': c.hex })}>
                <ViewTransition name={`paint-${c.slug}`} share="morph" default="none">
                  <PaintSwatch name={c.name} hex={c.hex} size="tile" />
                </ViewTransition>
                <span className={styles.meta}>
                  <span className={`paint-name ${styles.name}`}>{c.name}</span>
                  <span className={`mono ${styles.detail}`}>
                    <span>{c.count} build{c.count === 1 ? '' : 's'}</span>
                    <span aria-hidden="true" className={styles.dot}> · </span>
                    <span>{c.rarity}</span>
                  </span>
                </span>
              </IntentLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
