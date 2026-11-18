import Link from 'next/link';
import { getLocationEntries } from '../../lib/queries';
import RegistryMapWrapper from '../../components/RegistryMapWrapper';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Map',
};

export default async function MapPage() {
  const entries = await getLocationEntries();

  return (
    <main className={`page page--wide ${styles.main}`}>
      <div className={styles.head}>
        <Link href="/" className="link link-target">
          ← Home
        </Link>
        <h1 className={`title ${styles.heading}`}>Registry map</h1>
        <span className={`faint ${styles.count}`}>{entries.length} builds with location data</span>
      </div>

      <RegistryMapWrapper entries={entries} />
    </main>
  );
}
