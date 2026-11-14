import Link from 'next/link';
import MapSkeleton from '../../components/MapSkeleton';
import styles from './page.module.css';

export default function MapLoading() {
  return (
    <main className={`page page--wide ${styles.main}`}>
      <div className={styles.head}>
        <Link href="/" className="link">
          ← Home
        </Link>
        <h1 className={`title ${styles.heading}`}>Registry Map</h1>
      </div>

      <MapSkeleton />
    </main>
  );
}
