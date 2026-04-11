import Link from 'next/link';
import { getEntries } from '../../lib/queries';
import EntryTable from '../../components/EntryTable';
import SubmittedBanner from '../../components/SubmittedBanner';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Entries — BMW Individual Colors Registry',
};

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; updated?: string }>;
}) {
  const entries = await getEntries();
  const params = await searchParams;
  const submitted = params.submitted === '1';
  const updated = params.updated === '1';

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

      {submitted && <SubmittedBanner />}
      {updated && (
        <SubmittedBanner
          title="Entry updated"
          body="Your changes have been saved and will appear in the registry shortly."
        />
      )}

      <div
        style={{
          background: '#0f1923',
          border: '1px solid #2d3f55',
          borderRadius: 12,
          padding: '1.5rem',
          overflow: 'hidden',
        }}
      >
        <EntryTable entries={entries} />
      </div>
    </main>
  );
}
