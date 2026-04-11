import Link from 'next/link';
import { getEntries, getLocationEntries } from '../../lib/queries';
import ReportsClient from '../../components/ReportsClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reports — BMW Individual Colors Registry',
};

export default async function ReportsPage() {
  const [entries, locationEntries] = await Promise.all([
    getEntries(),
    getLocationEntries(),
  ]);

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/" style={{ color: '#1C69D4', textDecoration: 'none', fontSize: 14 }}>
          ← Home
        </Link>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', marginBottom: 16 }}>
        Reports &amp; Analytics
      </h1>

      <ReportsClient entries={entries} locationEntries={locationEntries} />
    </main>
  );
}
