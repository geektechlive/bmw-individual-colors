'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import PaintSwatch from '../PaintSwatch';
import type { FieldErrorProps } from './field-error';
import styles from './form.module.css';

interface Props {
  colors: string[];
  initialValue?: string;
  /** Id of the text input; the submit form's e2e tests use the default. */
  inputId?: string;
  errorProps?: FieldErrorProps;
}

const LISTBOX_ID = 'ext-color-listbox';
const HINT_ID = 'ext-color-hint';
const optionId = (i: number) => `ext-color-option-${i}`;

/** ARIA combobox: free-text input with a filtered listbox of known paints. */
export default function ColorCombobox({
  colors,
  initialValue = '',
  inputId = 'ext_color_input',
  errorProps = {},
}: Props) {
  const [search, setSearch] = useState(initialValue);
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => colors.filter((c) => c.toLowerCase().includes(search.toLowerCase())),
    [colors, search],
  );
  const isOpen = open && filtered.length > 0;

  // Keep the keyboard-highlighted option in view inside the scrolling listbox.
  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function select(name: string) {
    setValue(name);
    setSearch(name);
    setOpen(false);
    setActiveIndex(-1);
  }

  function step(delta: 1 | -1) {
    if (filtered.length === 0) return;
    if (!open) {
      setOpen(true);
      setActiveIndex(delta === 1 ? 0 : filtered.length - 1);
      return;
    }
    setActiveIndex((i) => {
      if (delta === 1) return (i + 1) % filtered.length;
      return i <= 0 ? filtered.length - 1 : i - 1;
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      step(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter' && isOpen && activeIndex >= 0 && filtered[activeIndex]) {
      e.preventDefault();
      select(filtered[activeIndex]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const describedBy = errorProps['aria-describedby']
    ? `${errorProps['aria-describedby']} ${HINT_ID}`
    : HINT_ID;

  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>Individual Color *</label>
      <div className={styles.comboWrap}>
        <div className={styles.comboRow}>
          {value && <PaintSwatch name={value} size="chip" />}
          <input
            type="text"
            id={inputId}
            className={`input ${styles.comboInput}`}
            placeholder="Type to search or enter a color name..."
            value={search}
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={LISTBOX_ID}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
            aria-invalid={errorProps['aria-invalid']}
            aria-describedby={describedBy}
            onChange={(e) => {
              setSearch(e.target.value);
              setValue(e.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => { setOpen(false); setActiveIndex(-1); }}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Hidden input carries the actual value to the server action */}
        <input type="hidden" name="ext_color" value={value} />

        <div
          ref={listRef}
          role="listbox"
          id={LISTBOX_ID}
          aria-label="Individual colors"
          hidden={!isOpen}
          // a scrolling container is a Tab stop in Chromium; focus stays on the input
          tabIndex={-1}
          className={styles.listbox}
        >
          {filtered.map((c, i) => (
            <div
              key={c}
              id={optionId(i)}
              role="option"
              aria-selected={c === value}
              // mousedown would blur the input and close the list before the click lands
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(c)}
              onMouseEnter={() => setActiveIndex(i)}
              className={[
                styles.option,
                c === value ? styles.optionSelected : '',
                i === activeIndex ? styles.optionActive : '',
              ].join(' ')}
            >
              <PaintSwatch name={c} size="chip-sm" />
              <span className={styles.optionName}>{c}</span>
            </div>
          ))}
        </div>
      </div>
      <p id={HINT_ID} className={`field-hint ${styles.hint}`}>
        Select from the list or type a custom color name if yours isn&apos;t listed.
      </p>
    </div>
  );
}
