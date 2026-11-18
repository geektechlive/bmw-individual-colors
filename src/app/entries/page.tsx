import Link from 'next/link';
import { getEntries } from '../../lib/queries';

export const dynamic = 'force-dynamic';
import EntryTable from '../../components/EntryTable';
import SubmittedBanner from '../../components/SubmittedBanner';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'All builds',
};

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; updated?: string; deleted?: string }>;
}) {
  const entries = await getEntries();
  const params = await searchParams;
  const submitted = params.submitted === '1';
  const updated = params.updated === '1';
  const deleted = params.deleted === '1';

  return (
    <main className="page">
      <div className={styles.back}>
        <Link href="/" className="link link-target">
          ← Home
        </Link>
      </div>

      <div className={styles.head}>
        <div>
          <h1 className={`title ${styles.heading}`}>All Entries</h1>
          <p className={`muted ${styles.count}`}>{entries.length} builds in the registry</p>
        </div>
        <Link href="/submit" className="btn btn--primary">
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
      {deleted && (
        <SubmittedBanner
          title="Entry deleted"
          body="Your entry has been permanently removed from the registry."
        />
      )}

      {/* No inner Suspense: the page renders per request, so EntryTable's useSearchParams
          has the real params on the server, and a second loading state made the footer
          jump when the table streamed in (#63). loading.tsx is the only loading state. */}
      <div className={`card ${styles.tableCard}`}>
        <EntryTable entries={entries} />
      </div>
    </main>
  );
}
