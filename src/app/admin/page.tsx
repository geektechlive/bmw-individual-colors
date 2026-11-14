import { adminLogout, adminModerate } from '../actions';
import { hasAdminSession } from '../../lib/admin-auth';
import { getModerationQueue } from '../../lib/queries';
import { FLAG_REASON_LABELS, type FlagReason } from '../../lib/flag-validation';
import { isKnownModerationError } from '../../lib/moderation';
import type { BmwEntry } from '../../types';
import AdminLoginForm from './AdminLoginForm';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ error?: string }>;
}

function reasonLabel(reason: string): string {
  return FLAG_REASON_LABELS[reason as FlagReason] ?? reason;
}

function EntrySummary({ e }: { e: BmwEntry }) {
  return (
    <>
      <div className={styles.entryTitle}>
        {e.ext_color} — {e.model_year} {e.body_style}
        {e.competition ? ' Competition' : ''}
      </div>
      <div className={styles.entryMeta}>
        {e.drivetrain} · {e.transmission}
        {e.interior_color && ` · ${e.interior_color}`}
        {e.wheels && ` · ${e.wheels}`}
      </div>
      <div className={styles.entrySource}>
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
function ModerationButton({ op, id, label, variant }: { op: string; id: string; label: string; variant: string }) {
  return (
    <form action={adminModerate}>
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={`btn btn--sm ${variant}`}>
        {label}
      </button>
    </form>
  );
}

export default async function AdminPage({ searchParams }: Props) {
  if (!(await hasAdminSession())) {
    return (
      <main className={`page page--text ${styles.main}`}>
        <h1 className="title">Admin sign-in</h1>
        <AdminLoginForm />
      </main>
    );
  }

  const { error: rawError } = await searchParams;
  const error = isKnownModerationError(rawError) ? rawError : undefined;
  const queue = await getModerationQueue();

  return (
    <main className={`page page--text ${styles.main}`}>
      <div className={styles.header}>
        <h1 className="title">Admin — Reported Entries</h1>
        <form action={adminLogout}>
          <button type="submit" className="btn btn--sm">
            Sign out
          </button>
        </form>
      </div>

      {error && (
        <div role="alert" className={`alert alert--danger ${styles.notice}`}>
          {error}
        </div>
      )}

      {!queue.ok ? (
        <div role="alert" className={`alert alert--danger ${styles.notice}`}>
          Couldn&apos;t load reports or deleted entries. Nothing is shown so you don&apos;t act on stale data;
          reload to try again.
        </div>
      ) : (
        <>
          <p className={styles.mutedNote}>
            {queue.flagged.length === 0
              ? 'No open reports.'
              : `${queue.flagged.length} reported ${queue.flagged.length === 1 ? 'entry' : 'entries'}. Dismiss keeps the entry; Delete hides it (restorable below).`}
          </p>

          {queue.flagged.map(({ entry, flags }) => (
            <div key={entry.id} className={styles.row}>
              <div className={styles.body}>
                <EntrySummary e={entry} />
                <ul className={styles.flags}>
                  {flags.map((f) => (
                    <li key={f.id} className={styles.flag}>
                      <span className={styles.flagReason}>🚩 {reasonLabel(f.reason)}</span>
                      <span className={styles.flagDate}>
                        {' · '}
                        {new Date(f.created_at).toLocaleDateString()}
                      </span>
                      {f.note && <div className={styles.flagNote}>&ldquo;{f.note}&rdquo;</div>}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.actions}>
                <ModerationButton op="dismiss" id={entry.id} label="Dismiss" variant="" />
                <ModerationButton op="delete" id={entry.id} label="Delete" variant="btn--danger" />
              </div>
            </div>
          ))}

          <h2 className={`section-title ${styles.sectionTitle}`}>Recently deleted</h2>
          <p className={styles.mutedNote}>
            {queue.deleted.length === 0
              ? 'No deleted entries.'
              : `${queue.deleted.length} deleted ${queue.deleted.length === 1 ? 'entry' : 'entries'}.`}
          </p>

          {queue.deleted.map((e) => (
            <div key={e.id} className={styles.row}>
              <div className={styles.body}>
                <EntrySummary e={e} />
                {e.deleted_at && (
                  <div className={styles.deletedAt}>Deleted {new Date(e.deleted_at).toLocaleString()}</div>
                )}
              </div>
              <div className={styles.actions}>
                <ModerationButton op="restore" id={e.id} label="Restore" variant="btn--primary" />
              </div>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
