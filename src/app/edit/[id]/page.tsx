import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '../../../lib/supabase';
import { generateEditToken, timingSafeEqual } from '../../../lib/edit-token';
import EditVerifyForm from './EditVerifyForm';
import EditEntryForm from './EditEntryForm';
import type { BmwEntry } from '../../../types';
import type { Metadata } from 'next';

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
    const expectedToken = await generateEditToken(id, entry.forum_username ?? '', expiresAt);
    tokenValid = timingSafeEqual(token, expectedToken);
  }

  const needsVerification = !token || expiresAt <= 0 || isExpired || !tokenValid;

  if (needsVerification) {
    return (
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/entries"
            style={{ color: '#1C69D4', textDecoration: 'none', fontSize: 14 }}
          >
            ← Back to Entries
          </Link>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#e2e8f0', marginBottom: 6 }}>
          Edit Entry
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: isExpired ? 8 : 28 }}>
          Verify you&apos;re the original submitter to make changes.
        </p>
        {isExpired && (
          <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 20 }}>
            Your edit session expired. Please verify again to continue.
          </p>
        )}

        <div style={{
          background: '#0f1923',
          border: '1px solid #2d3f55',
          borderRadius: 12,
          padding: '1.5rem',
        }}>
          <EditVerifyForm entryId={id} />
        </div>
      </main>
    );
  }

  // Verified — entry already fetched and confirmed present above
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/entries"
          style={{ color: '#1C69D4', textDecoration: 'none', fontSize: 14 }}
        >
          ← Back to Entries
        </Link>
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>
        Edit Entry
      </h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>
        Editing entry for <span style={{ color: '#4d8fd4', fontWeight: 600 }}>{entry.forum_username}</span>
      </p>

      <div style={{
        background: '#0f1923',
        border: '1px solid #2d3f55',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <EditEntryForm entry={entry as BmwEntry} editToken={token} editExpiry={exp} />
      </div>
    </main>
  );
}
