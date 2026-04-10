import { redirect } from 'next/navigation';
import { createAdminClient } from '../../lib/supabase';
import { deleteEntry, dismissFlag } from '../actions';
import type { BmwEntry } from '../../types';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function AdminPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token || token !== process.env.ADMIN_TOKEN) {
    redirect('/');
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('bmwic_entries')
    .select('*')
    .gt('flag_count', 0)
    .order('flag_count', { ascending: false });

  const flagged = (data ?? []) as BmwEntry[];

  const rowStyle: React.CSSProperties = {
    background: '#0f1923',
    border: '1px solid #2d3f55',
    borderRadius: 8,
    padding: '1rem',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  };

  const btnStyle = (color: string): React.CSSProperties => ({
    padding: '6px 14px',
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  });

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0', marginBottom: 8 }}>
        Admin — Flagged Entries
      </h1>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 32 }}>
        {flagged.length === 0 ? 'No flagged entries.' : `${flagged.length} flagged ${flagged.length === 1 ? 'entry' : 'entries'}.`}
      </p>

      {flagged.map((e) => (
        <div key={e.id} style={rowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
              {e.ext_color} — {e.model_year} {e.body_style}{e.competition ? ' Competition' : ''}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>
              {e.drivetrain} · {e.transmission}
              {e.interior_color && ` · ${e.interior_color}`}
              {e.wheels && ` · ${e.wheels}`}
            </div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
              {e.source_forum && `[${e.source_forum}] `}{e.forum_username ?? 'No username'}
              {' · '}
              {[e.location_city, e.location_state, e.location_country].filter(Boolean).join(', ') || 'No location'}
            </div>
            <div style={{ color: '#f87171', fontSize: 12, fontWeight: 600, marginTop: 6 }}>
              🚩 {e.flag_count} flag{e.flag_count !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <form action={async () => {
              'use server';
              await dismissFlag(e.id, token!);
            }}>
              <button type="submit" style={btnStyle('#374151')}>Dismiss</button>
            </form>
            <form action={async () => {
              'use server';
              await deleteEntry(e.id, token!);
            }}>
              <button type="submit" style={btnStyle('#991b1b')}>Delete</button>
            </form>
          </div>
        </div>
      ))}
    </main>
  );
}
