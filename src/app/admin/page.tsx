import { adminLogout, adminModerate } from '../actions';
import { hasAdminSession } from '../../lib/admin-auth';
import { getModerationQueue } from '../../lib/queries';
import { FLAG_REASON_LABELS, type FlagReason } from '../../lib/flag-validation';
import { isKnownModerationError } from '../../lib/moderation';
import type { BmwEntry } from '../../types';
import AdminLoginForm from './AdminLoginForm';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ error?: string }>;
}

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
  flexWrap: 'wrap',
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

const noticeStyle = (tone: 'error' | 'muted'): React.CSSProperties => ({
  background: tone === 'error' ? 'rgba(153, 27, 27, 0.15)' : 'transparent',
  border: tone === 'error' ? '1px solid #991b1b' : 'none',
  borderRadius: 8,
  padding: tone === 'error' ? '10px 14px' : 0,
  marginBottom: 16,
  color: tone === 'error' ? '#fca5a5' : '#64748b',
  fontSize: 13,
});

function reasonLabel(reason: string): string {
  return FLAG_REASON_LABELS[reason as FlagReason] ?? reason;
}

function EntrySummary({ e }: { e: BmwEntry }) {
  return (
    <>
      <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
        {e.ext_color} — {e.model_year} {e.body_style}
        {e.competition ? ' Competition' : ''}
      </div>
      <div style={{ color: '#94a3b8', fontSize: 13 }}>
        {e.drivetrain} · {e.transmission}
        {e.interior_color && ` · ${e.interior_color}`}
        {e.wheels && ` · ${e.wheels}`}
      </div>
      <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
        {e.source_forum && `[${e.source_forum}] `}
        {e.forum_username ?? 'No username'}
        {' · '}
        {[e.location_city, e.location_state, e.location_country].filter(Boolean).join(', ') || 'No location'}
        {' · '}
        {e.user_submitted ? 'submitted on the site' : 'imported from the forum'}
      </div>
    </>
  );
}

/** Hidden op/id inputs only: the session cookie authorizes, never a token. */
function ModerationButton({ op, id, label, color }: { op: string; id: string; label: string; color: string }) {
  return (
    <form action={adminModerate}>
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="id" value={id} />
      <button type="submit" style={btnStyle(color)}>
        {label}
      </button>
    </form>
  );
}

export default async function AdminPage({ searchParams }: Props) {
  if (!(await hasAdminSession())) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0', marginBottom: 16 }}>Admin sign-in</h1>
        <AdminLoginForm />
      </main>
    );
  }

  const { error: rawError } = await searchParams;
  const error = isKnownModerationError(rawError) ? rawError : undefined;
  const queue = await getModerationQueue();

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0' }}>Admin — Reported Entries</h1>
        <form action={adminLogout}>
          <button type="submit" style={btnStyle('#374151')}>
            Sign out
          </button>
        </form>
      </div>

      {error && (
        <div role="alert" style={noticeStyle('error')}>
          {error}
        </div>
      )}

      {!queue.ok ? (
        <div role="alert" style={noticeStyle('error')}>
          Couldn&apos;t load reports or deleted entries. Nothing is shown so you don&apos;t act on stale data;
          reload to try again.
        </div>
      ) : (
        <>
          <p style={noticeStyle('muted')}>
            {queue.flagged.length === 0
              ? 'No open reports.'
              : `${queue.flagged.length} reported ${queue.flagged.length === 1 ? 'entry' : 'entries'}. Dismiss keeps the entry; Delete hides it (restorable below).`}
          </p>

          {queue.flagged.map(({ entry, flags }) => (
            <div key={entry.id} style={rowStyle}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <EntrySummary e={entry} />
                <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'grid', gap: 6 }}>
                  {flags.map((f) => (
                    <li key={f.id} style={{ fontSize: 13, color: '#e2e8f0' }}>
                      <span style={{ color: '#f87171', fontWeight: 700 }}>🚩 {reasonLabel(f.reason)}</span>
                      <span style={{ color: '#64748b', fontSize: 11 }}>
                        {' · '}
                        {new Date(f.created_at).toLocaleDateString()}
                      </span>
                      {f.note && <div style={{ color: '#cbd5e1', marginTop: 2 }}>&ldquo;{f.note}&rdquo;</div>}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <ModerationButton op="dismiss" id={entry.id} label="Dismiss" color="#374151" />
                <ModerationButton op="delete" id={entry.id} label="Delete" color="#991b1b" />
              </div>
            </div>
          ))}

          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', margin: '40px 0 8px' }}>Recently deleted</h2>
          <p style={noticeStyle('muted')}>
            {queue.deleted.length === 0
              ? 'No deleted entries.'
              : `${queue.deleted.length} deleted ${queue.deleted.length === 1 ? 'entry' : 'entries'}.`}
          </p>

          {queue.deleted.map((e) => (
            <div key={e.id} style={rowStyle}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <EntrySummary e={e} />
                {e.deleted_at && (
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                    Deleted {new Date(e.deleted_at).toLocaleString()}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <ModerationButton op="restore" id={e.id} label="Restore" color="#166534" />
              </div>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
