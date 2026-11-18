'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import PaintSwatch from '../PaintSwatch';
import type { FieldErrorProps } from './field-error';
import { optionToPick } from './combobox-nav';
import { useComboboxList } from './useComboboxList';
import styles from './form.module.css';

const nameOf = (name: string) => name;

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
  const { matches: filtered, isOpen, setOpen, activeIndex, listRef, close, openFresh, handleNavKey } =
    useComboboxList({ items: colors, getName: nameOf, query: search });

  function select(name: string) {
    setValue(name);
    setSearch(name);
    close();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (handleNavKey(e)) return;
    const picked = e.key === 'Enter' ? optionToPick(isOpen, activeIndex, filtered) : null;
    if (picked !== null) {
      // Only a keyboard-highlighted option; with none, Enter keeps what was typed.
      e.preventDefault();
      select(picked);
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
              openFresh();
            }}
            onFocus={() => setOpen(true)}
            onBlur={close}
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
