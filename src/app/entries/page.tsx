import Link from 'next/link';
import { getEntries } from '../../lib/queries';
import EntryTable from '../../components/EntryTable';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Entries — BMW Individual Colors Registry',
};

export const dynamic = 'force-dynamic';

export default async function EntriesPage() {
  const entries = await getEntries();

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/"
          style={{ color: '#1C69D4', textDecoration: 'none', fontSize: 14 }}
        >
          ← Home
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>
            All Entries
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            {entries.length} builds in the registry
          </p>
        </div>
        <Link
          href="/submit"
          style={{
            padding: '10px 20px',
            background: '#1C69D4',
            color: '#ffffff',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          + Submit Build
        </Link>
      </div>

      <div
        style={{
          background: '#0f1923',
          border: '1px solid #2d3f55',
          borderRadius: 12,
          padding: '1.5rem',
        }}
      >
        <EntryTable entries={entries} />
      </div>
    </main>
  );
}
