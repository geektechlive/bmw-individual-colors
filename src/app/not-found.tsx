import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <main className={styles.main}>
      <div className={styles.mark}>
        <div className="stripe">
          <span />
          <span />
          <span />
        </div>
      </div>
      <h1 className={styles.heading}>404</h1>
      <p className={styles.text}>
        This page doesn&apos;t exist in the registry. It may have been moved, deleted, or never
        built.
      </p>
      <Link href="/" className="btn btn--primary">
        Back to Home
      </Link>
    </main>
  );
}
