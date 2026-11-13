/**
 * Flag reasons (#31). A flag must say what is wrong so the owner can act on
 * it at /admin; a bare count could only be guessed at. Shared by FlagButton
 * (labels) and the flagEntry Server Action (validation). The DB mirrors these
 * rules with CHECK constraints on public.bmwic_flags (schema.sql).
 *
 * Pure: safe to import from Client Components.
 */

export const FLAG_REASONS = ['wrong_color', 'wrong_details', 'duplicate', 'not_real', 'other'] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];

export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  wrong_color: 'Wrong color',
  wrong_details: 'Wrong year, model or other details',
  duplicate: 'Duplicate of another entry',
  not_real: 'Not a real build / spam',
  other: 'Other (please explain)',
};

/** Matches the DB check, which uses char_length (Unicode code points). */
export const FLAG_NOTE_MAX = 280;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FlagValidation =
  | { ok: true; value: { entryId: string; reason: FlagReason; note: string | null } }
  | { ok: false; error: string };

function isFlagReason(value: unknown): value is FlagReason {
  return typeof value === 'string' && (FLAG_REASONS as readonly string[]).includes(value);
}

export function validateFlagInput(input: { id: unknown; reason: unknown; note: unknown }): FlagValidation {
  if (typeof input.id !== 'string' || !UUID.test(input.id)) {
    return { ok: false, error: 'That entry could not be found.' };
  }
  if (!isFlagReason(input.reason)) {
    return { ok: false, error: 'Please choose what is wrong with this entry.' };
  }
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if ([...note].length > FLAG_NOTE_MAX) {
    return { ok: false, error: `Please keep the note under ${FLAG_NOTE_MAX} characters.` };
  }
  if (input.reason === 'other' && note === '') {
    return { ok: false, error: 'Please describe the problem when choosing "Other".' };
  }
  return { ok: true, value: { entryId: input.id, reason: input.reason, note: note === '' ? null : note } };
}
