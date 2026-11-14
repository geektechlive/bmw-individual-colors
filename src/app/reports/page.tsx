import Link from 'next/link';
import { getEntries } from '../../lib/queries';
import ReportsClient from '../../components/ReportsClient';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reports — BMW Individual Colors Registry',
};

export default async function ReportsPage() {
  const entries = await getEntries();

  return (
    <main className="page">
      <div className={styles.back}>
        <Link href="/" className="link">
          ← Home
        </Link>
      </div>

      <h1 className={`title ${styles.heading}`}>Reports &amp; Analytics</h1>

      <ReportsClient entries={entries} />
    </main>
  );
}
