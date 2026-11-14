import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '../../../lib/supabase';
import { verifyEditToken } from '../../../lib/edit-token';
import EditVerifyForm from './EditVerifyForm';
import EditEntryForm from './EditEntryForm';
import type { BmwEntry } from '../../../types';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit Entry — BMW Individual Colors Registry',
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; exp?: string }>;
}

export default async function EditPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token, exp } = await searchParams;

  const supabase = createAdminClient();
  const { data: entry } = await supabase
    .from('bmwic_entries')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!entry) notFound();

  const expiresAt = exp ? parseInt(exp, 10) : 0;
  // eslint-disable-next-line react-hooks/purity -- Server Component; Date.now() runs once per request on the server
  const isExpired = !!token && expiresAt > 0 && Date.now() > expiresAt;

  let tokenValid = false;
  if (token && expiresAt > 0 && !isExpired) {
    tokenValid = await verifyEditToken(token, id, entry.forum_username ?? '', expiresAt);
  }

  const needsVerification = !token || expiresAt <= 0 || isExpired || !tokenValid;

  if (needsVerification) {
    return (
      <main className="page page--narrow">
        <div className={styles.back}>
          <Link href="/entries" className="link">
            ← Back to Entries
          </Link>
        </div>

        <h1 className={`title ${styles.heading}`}>Edit Entry</h1>
        <p className={`faint ${styles.lede} ${isExpired ? styles.ledeShort : ''}`}>
          Verify you&apos;re the original submitter to make changes.
        </p>
        {isExpired && (
          <p className={styles.expired}>
            Your edit session expired. Please verify again to continue.
          </p>
        )}

        <div className="card card--pad">
          <EditVerifyForm entryId={id} />
        </div>
      </main>
    );
  }

  // Verified — entry already fetched and confirmed present above
  return (
    <main className="page page--form">
      <div className={styles.back}>
        <Link href="/entries" className="link">
          ← Back to Entries
        </Link>
      </div>

      <h1 className={`title ${styles.heading}`}>Edit Entry</h1>
      <p className={`faint ${styles.lede}`}>
        Editing entry for <span className={styles.who}>{entry.forum_username}</span>
      </p>

      <div className="card card--pad">
        <EditEntryForm entry={entry as BmwEntry} editToken={token} editExpiry={exp} />
      </div>
    </main>
  );
}
