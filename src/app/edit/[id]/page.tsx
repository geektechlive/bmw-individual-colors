import { notFound } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { createAdminClient } from '../../../lib/supabase';
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
  searchParams: Promise<{ token?: string }>;
}

export default async function EditPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    return (
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          async
        />
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
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>
          Verify you&apos;re the original submitter to make changes.
        </p>

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

  // Verified — fetch entry and show edit form
  const supabase = createAdminClient();
  const { data: entry } = await supabase
    .from('bmwic_entries')
    .select('*')
    .eq('id', id)
    .single();

  if (!entry) notFound();

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
        <EditEntryForm entry={entry as BmwEntry} editToken={token} />
      </div>
    </main>
  );
}
