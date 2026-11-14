'use client';

import { useActionState, useState } from 'react';
import { updateEntry, deleteOwnEntry } from '../../actions';
import FormFields from '../../../components/form/FormFields';
import FormError from '../../../components/form/FormError';
import { fieldForError } from '../../../components/form/field-error';
import type { FormDefaults } from '../../../components/form/options';
import { defaultsFromSubmission, useActionStateKeepingValues } from '../../../components/form/keep-values';
import { useLocation } from '../../../components/form/useLocation';
import type { BmwEntry } from '../../../types';
import styles from '../../../components/EntryForm.module.css';

interface Props {
  entry: BmwEntry;
  editToken: string | undefined;
  editExpiry: string | undefined;
}

function entryToVariant(entry: BmwEntry): string {
  if (!entry.competition) return 'Base (RWD)';
  if (entry.drivetrain === 'AWD' || entry.drivetrain.includes('xDrive')) return 'Competition xDrive';
  return 'Competition';
}

function entryToDefaults(entry: BmwEntry): FormDefaults {
  return {
    modelYear: entry.model_year,
    bodyStyle: entry.body_style,
    variant: entryToVariant(entry),
    transmission: entry.transmission || '8AT',
    extColor: entry.ext_color,
    interiorColor: entry.interior_color ?? '',
    interiorSeats: entry.interior_seats ?? '',
    interiorLeather: entry.interior_leather ?? '',
    wheels: entry.wheels ?? '',
    city: entry.location_city ?? '',
    notes: entry.notes ?? '',
    forum: entry.source_forum ?? 'BimmerPost',
  };
}

export default function EditEntryForm({ entry, editToken, editExpiry }: Props) {
  // Keeps the last submission so a server error doesn't reset the user's edits.
  const [state, action, isPending, submitted, round] = useActionStateKeepingValues(updateEntry, {});
  const [deleteState, deleteAction, isDeletePending] = useActionState(deleteOwnEntry, {});
  const loc = useLocation(entry.location_country ?? undefined, entry.location_state ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
    <form action={action} className={styles.form}>
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="edit_token" value={editToken ?? ''} />
      <input type="hidden" name="exp" value={editExpiry ?? ''} />

      {entry.edit_count > 0 && (
        <p className={`field-hint ${styles.hint}`}>
          Edited {entry.edit_count} {entry.edit_count === 1 ? 'time' : 'times'}
          {entry.last_edited_at && (
            <> &middot; last updated {new Date(entry.last_edited_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</>
          )}
        </p>
      )}

      {loc.countryMismatch && (
        <div className="alert alert--warn">
          Original country &ldquo;{entry.location_country}&rdquo; was not recognized. Please select the correct country below before saving.
        </div>
      )}

      <FormError message={state?.error} />

      <FormFields
        key={round}
        defaults={defaultsFromSubmission(submitted, entryToDefaults(entry))}
        loc={loc}
        errorField={fieldForError(state?.error)}
        colorInputId="ext_color_search"
      />

      <button
        type="submit"
        disabled={isPending}
        className={`btn btn--primary ${styles.submit}`}
      >
        {isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </form>

      {/* Delete entry — separate form, must not be nested inside the update form */}
      <div className={styles.deleteZone}>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="btn btn--danger"
          >
            Delete this entry
          </button>
        ) : (
          <div className={styles.deleteConfirm}>
            <p className={styles.dangerText}>
              This will permanently remove your entry from the registry. Are you sure?
            </p>
            {deleteState?.error && (
              <p className={styles.dangerTextSm}>{deleteState.error}</p>
            )}
            <div className={styles.deleteRow}>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={entry.id} />
                <input type="hidden" name="edit_token" value={editToken ?? ''} />
                <input type="hidden" name="exp" value={editExpiry ?? ''} />
                <button
                  type="submit"
                  disabled={isDeletePending}
                  className={`btn ${styles.deleteSolid}`}
                >
                  {isDeletePending ? 'Deleting...' : 'Yes, delete it'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="btn"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
