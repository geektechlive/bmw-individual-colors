import Link from 'next/link';
import { getLocationEntries } from '../../lib/queries';
import RegistryMapWrapper from '../../components/RegistryMapWrapper';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Registry Map — BMW Individual Colors Registry',
};

export default async function MapPage() {
  const entries = await getLocationEntries();

  return (
    <main style={{ maxWidth: 1440, margin: '0 auto', padding: '1.5rem 1.5rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16 }}>
        <Link href="/" style={{ color: '#1C69D4', textDecoration: 'none', fontSize: 14 }}>
          ← Home
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>
          Registry Map
        </h1>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          {entries.length} builds with location data
        </span>
      </div>

      <RegistryMapWrapper entries={entries} />
    </main>
  );
}
