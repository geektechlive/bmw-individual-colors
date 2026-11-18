'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import FlagDialog from './FlagDialog';
import styles from './RowActions.module.css';

const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;

/**
 * The one quiet action on a build row (#69): a "···" button whose menu offers "Edit this
 * build" and "Report a problem". Used on /entries and on the paint-page build list.
 */
export default function RowActions({
  id,
  reported: reportedProp,
  onReported,
  phoneLabel = false,
}: {
  id: string;
  /** On phones show the words "Edit or report" instead of the bare ··· (paint page, #86). */
  phoneLabel?: boolean;
  /** Lifted by a list that renders the same build twice (/entries); local state otherwise. */
  reported?: boolean;
  onReported?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportedLocal, setReportedLocal] = useState(false);
  const reported = reportedProp ?? reportedLocal;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const menuId = useId();

  const closeMenu = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  // The menu lives in the browser's top layer (popover), so no table wrapper clips it and no
  // transformed ancestor moves it. Place it under the button, or above when it would run off.
  const place = useCallback(() => {
    const menu = menuRef.current;
    const button = buttonRef.current;
    if (!menu || !button) return;
    const b = button.getBoundingClientRect();
    // Once the button has scrolled fully out of view, close rather than follow it off-screen.
    if (b.bottom <= 0 || b.top >= window.innerHeight || b.right <= 0 || b.left >= window.innerWidth) {
      setOpen(false);
      return;
    }
    const m = menu.getBoundingClientRect();
    const left = Math.max(VIEWPORT_MARGIN, Math.min(b.right - m.width, window.innerWidth - m.width - VIEWPORT_MARGIN));
    const below = b.bottom + MENU_GAP;
    const top = below + m.height > window.innerHeight - VIEWPORT_MARGIN ? Math.max(VIEWPORT_MARGIN, b.top - MENU_GAP - m.height) : below;
    menu.style.setProperty('--menu-x', `${left}px`);
    menu.style.setProperty('--menu-y', `${top}px`);
  }, []);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!open || !menu) return;
    menu.showPopover();
    place();
    menu.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      closeMenu(false);
    };
    // Escape works wherever focus is (clicking the hint moves it to the page).
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      closeMenu(true);
    };
    // The menu is fixed, so it follows its button when the page scrolls or resizes.
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, closeMenu, place]);

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'));
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === ' ' && document.activeElement instanceof HTMLAnchorElement) {
      // A link activates on Enter only; a menu item should also take Space.
      e.preventDefault();
      document.activeElement.click();
    } else if (e.key === 'Tab') {
      // Focus the trigger first and leave the key's default alone: Tab then moves on from the
      // trigger. Closing alone unmounts the focused item and focus drops to body (#84, WCAG 2.4.3).
      closeMenu(true);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      if (items.length === 0) return;
      const last = items.length - 1;
      const next =
        e.key === 'Home' ? 0 : e.key === 'End' ? last : e.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
      items[next].focus();
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        className={phoneLabel ? `${styles.trigger} ${styles.labelled}` : styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="Edit or report this build"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span aria-hidden="true" className={styles.glyph}>···</span>
        {phoneLabel && <span className={styles.text}>Edit or report</span>}
      </button>
      {open && (
        <div ref={menuRef} id={menuId} popover="manual" className={styles.popover} onKeyDown={onMenuKeyDown}>
          <div role="menu" aria-labelledby={buttonId} className={styles.menu}>
            {/* No prefetch: /edit bypasses the edge cache, so prefetching one per visible
                row fired bursts of full renders that tripped the Workers Free CPU limit.
                Edits are rare; load on click. */}
            <Link href={`/edit/${id}`} prefetch={false} role="menuitem"
              tabIndex={-1}
              className={styles.item}
              onClick={() => closeMenu(false)}
            >
              Edit this build
            </Link>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={reported}
              className={styles.item}
              onClick={() => {
                if (reported) return;
                setOpen(false);
                setReporting(true);
              }}
            >
              {reported ? 'Reported, thanks' : 'Report a problem'}
            </button>
          </div>
          <p className={styles.hint}>{"You'll need the forum username on the build to edit it."}</p>
        </div>
      )}
      {reporting && (
        <FlagDialog
          id={id}
          onClose={(sent) => {
            setReporting(false);
            if (sent) {
              setReportedLocal(true);
              onReported?.();
            }
            buttonRef.current?.focus();
          }}
        />
      )}
    </>
  );
}
