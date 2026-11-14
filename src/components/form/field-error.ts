/** Id of the form-level error message that invalid fields point at. */
export const FORM_ERROR_ID = 'form-error';

/** Field name (the `name` attribute) each server validation message is about. */
const MESSAGE_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ['Model year', 'model_year'],
  ['Transmission', 'transmission'],
  ['Individual color', 'ext_color'],
  ['Forum username', 'forum_username'],
  ['Notes', 'notes'],
];

/** The field a server error string is about, or null when it is not about one field. */
export function fieldForError(error: string | undefined): string | null {
  if (!error) return null;
  const hit = MESSAGE_PREFIXES.find(([prefix]) => error.startsWith(prefix));
  return hit ? hit[1] : null;
}

export interface FieldErrorProps {
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

/** Spread onto a control: marks it invalid and points it at the error when it is the failing field. */
export function fieldErrorProps(field: string, errorField: string | null): FieldErrorProps {
  if (field !== errorField) return {};
  return { 'aria-invalid': true, 'aria-describedby': FORM_ERROR_ID };
}
