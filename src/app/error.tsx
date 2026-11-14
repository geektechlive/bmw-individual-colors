'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import styles from './error.module.css';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.main}>
      <div className={styles.mark}>
        <div className="stripe">
          <span />
          <span />
          <span />
        </div>
      </div>
      <h1 className={styles.heading}>Something went wrong</h1>
      <p className={styles.text}>
        An unexpected error occurred while loading this page. You can try again or head back
        home.
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={() => reset()} className="btn btn--primary">
          Try again
        </button>
        <Link href="/" className="btn">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
