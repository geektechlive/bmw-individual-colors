'use client';

import { useState } from 'react';
import styles from './SubmittedBanner.module.css';

interface Props {
  title?: string;
  body?: string;
}

export default function SubmittedBanner({ title, body }: Props) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div data-testid="submitted-banner" className={styles.banner}>
      <div className={styles.text}>
        <div className={styles.title}>
          {title ?? 'Submission received'}
        </div>
        <div className={styles.body}>
          {body ?? "It should appear in the table right away; if you don't see it, refresh in a moment."}
        </div>
      </div>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        data-testid="submitted-banner-dismiss"
        className={styles.dismiss}
      >
        ×
      </button>
    </div>
  );
}
