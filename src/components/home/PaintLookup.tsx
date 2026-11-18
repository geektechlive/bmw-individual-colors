'use client';

import { useEffect, useId, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PaintSwatch from '../PaintSwatch';
import { enterIndex } from '../form/combobox-nav';
import { useComboboxList } from '../form/useComboboxList';
import { matchCountText } from '../../lib/paint-count';
import styles from './PaintLookup.module.css';

/** Just what the lookup needs; the home page builds this from the counts it already has. */
export interface LookupPaint {
  color: string;
  slug: string;
  count: number;
  hex: string;
}

interface Props {
  /** Already sorted by build count, most first: that is the order of the list. */
  paints: LookupPaint[];
}

/** How long typing must pause before the match count is announced. */
const COUNT_ANNOUNCE_MS = 300;

const nameOf = (p: LookupPaint) => p.color;
const buildsText = (n: number) => `${n} build${n === 1 ? '' : 's'}`;

/** The name split around the first place the query matches, so the match can be underlined. */
function splitMatch(name: string, query: string): [string, string, string] {
  const at = query ? name.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) return [name, '', ''];
  return [name.slice(0, at), name.slice(at, at + query.length), name.slice(at + query.length)];
}

/**
 * "Find your paint": a combobox over every paint in the registry (#68). Choosing one opens its
 * page. Options are plain rows, not links, so nothing prefetches until a paint is chosen.
 */
export default function PaintLookup({ paints }: Props) {
  const router = useRouter();
  const uid = useId();
  const inputId = `${uid}-input`;
  const listId = `${uid}-list`;
  const optionId = (i: number) => `${uid}-option-${i}`;

  const [query, setQuery] = useState('');
  const typed = query.trim();
  const { matches, isOpen, open, activeIndex, listRef, close, openFresh, handleNavKey } =
    useComboboxList({ items: paints, getName: nameOf, query: typed, highlightFirst: true });
  const showNone = open && typed !== '' && matches.length === 0;

  // The match count goes to screen readers once typing pauses (#83), not on every key.
  const countText = isOpen ? matchCountText(matches.length) : '';
  const [spoken, setSpoken] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSpoken(countText), COUNT_ANNOUNCE_MS);
    return () => clearTimeout(timer);
  }, [countText]);

  function go(paint: LookupPaint) {
    close();
    router.push(`/colors/${paint.slug}`);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (handleNavKey(e)) return;
    if (e.key !== 'Enter') return;
    e.preventDefault();
    // With the list closed (after Escape, or on refocus) Enter reopens it; it never navigates.
    if (!isOpen) {
      if (typed) openFresh();
      return;
    }
    const at = enterIndex(activeIndex, typed, matches.map(nameOf));
    if (at >= 0) go(matches[at]);
  }

  // Focus may move to the "submit your build" link in the no-match panel; only close when it leaves.
  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close();
  }

  return (
    <div className={styles.find} onBlur={handleBlur}>
      <label className={styles.label} htmlFor={inputId}>
        Find your paint
      </label>
      <div className={styles.box}>
        <svg className={styles.icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="6" />
          <path d="m13 13 5 5" />
        </svg>
        <input
          id={inputId}
          type="text"
          className={`input ${styles.input}`}
          placeholder="Search paints, e.g. Laguna"
          value={query}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          onChange={(e) => {
            setQuery(e.target.value);
            // Spaces alone are not a search: keep the list shut rather than show all 71 paints.
            if (e.target.value.trim()) openFresh();
            else close();
          }}
          // Reopening starts on the first option again; an open list keeps the highlight it has.
          onFocus={() => {
            if (typed && !open) openFresh();
          }}
          onClick={() => {
            if (typed && !open) openFresh();
          }}
          onKeyDown={handleKeyDown}
        />

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Paints"
          hidden={!isOpen}
          // a scrolling container is a Tab stop in Chromium; focus stays on the input
          tabIndex={-1}
          className={styles.list}
          // the padding and gaps between rows would focus this container and stop the keys working
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Rows exist only while the list is open: 71 hidden rows would sit in every page view. */}
          {isOpen && matches.map((p, i) => {
            const [before, hit, after] = splitMatch(p.color, typed);
            return (
              <div
                key={p.slug}
                id={optionId(i)}
                role="option"
                aria-selected={i === activeIndex}
                className={styles.option}
                // mousedown would blur the input and close the list before the click lands
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(p)}
              >
                <PaintSwatch name={p.color} hex={p.hex} size="chip-sm" />
                <span className={`${styles.name} paint-name`}>
                  {before}
                  {hit && <mark className={styles.mark}>{hit}</mark>}
                  {after}
                </span>
                <span className={styles.count}>{buildsText(p.count)}</span>
              </div>
            );
          })}
        </div>

        <div role="status">
          <span className="sr-only">{isOpen ? spoken : ''}</span>
          {showNone && (
            <div className={styles.none} onMouseDown={(e) => e.preventDefault()}>
              No paint called “{typed}” is registered yet. Check the spelling, or{' '}
              <Link href="/submit" className={`link ${styles.noneLink}`}>
                submit your build →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
