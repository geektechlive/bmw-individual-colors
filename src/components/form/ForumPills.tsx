'use client';

import { FORUMS } from './options';
import styles from './form.module.css';

interface Props {
  value: string;
  onChange: (forum: string) => void;
}

/**
 * Forum choice as pills. The radios are visually hidden, not removed, so they stay in the
 * tab order and the accessibility tree and arrow keys move between them. The focus ring is
 * drawn on the pill.
 */
export default function ForumPills({ value, onChange }: Props) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={`field-label ${styles.legend}`}>Forum</legend>
      <div className={`${styles.rowWrap} ${styles.rowWrapSpaced}`}>
        {FORUMS.map((f) => (
          <label key={f} className={`${styles.pill} ${value === f ? styles.pillActive : ''}`}>
            <input
              type="radio"
              name="source_forum"
              value={f}
              checked={value === f}
              onChange={() => onChange(f)}
              className="sr-only"
            />
            {f}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
