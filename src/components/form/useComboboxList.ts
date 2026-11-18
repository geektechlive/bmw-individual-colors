'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { isComposing, stepActive } from './combobox-nav';

interface Options<T> {
  items: readonly T[];
  /** Must be a stable function (declare it at module level) so the filter memoises. */
  getName: (item: T) => string;
  query: string;
}

/**
 * The state both paint comboboxes share: the substring filter, whether the list is open, the
 * keyboard-highlighted index, scrolling that option into view, and the arrow and Escape keys.
 * Enter and what a pick does differ (the submit form fills a text field, the home search
 * opens a page), so each component keeps its own Enter handling.
 */
export function useComboboxList<T>({ items, getName, query }: Options<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const needle = query.toLowerCase();
    return items.filter((item) => getName(item).toLowerCase().includes(needle));
  }, [items, getName, query]);
  const isOpen = open && matches.length > 0;

  // Keep the keyboard-highlighted option in view inside the scrolling listbox.
  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  /** Open the list for new typing, with nothing highlighted. */
  const openFresh = useCallback(() => {
    setOpen(true);
    setActiveIndex(-1);
  }, []);

  /** Handles ArrowUp, ArrowDown and Escape. Returns true when the key was used. */
  function handleNavKey(e: KeyboardEvent<HTMLInputElement>): boolean {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Arrows pick IME candidates while composing, so leave them alone. Enter is deliberately
      // not guarded: Android keyboards report it as composing or keyCode 229 on a finished word.
      if (isComposing(e)) return true;
      e.preventDefault();
      if (matches.length === 0) return true;
      if (!open) setOpen(true);
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((i) => stepActive(i, delta, matches.length, open));
      return true;
    }
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      close();
      return true;
    }
    return false;
  }

  return { matches, isOpen, open, setOpen, activeIndex, setActiveIndex, listRef, close, openFresh, handleNavKey };
}
