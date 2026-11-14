import { useActionState } from 'react';
import type { FormDefaults } from './options';

// React 19 resets uncontrolled fields when a form action returns. Our actions return on a
// duplicate warning or a server error, and without this the form would come back with its
// defaults, and the next submit would save a different car than the one the user typed
// (this is how the old "Submit Anyway" button saved wrong model years; see ADR 0017).
// Fix: remember what was submitted and pass it back to the fields as their default values,
// so React's reset restores the user's input.

const TEXT_FIELDS = {
  body_style: 'bodyStyle',
  variant: 'variant',
  transmission: 'transmission',
  ext_color: 'extColor',
  interior_color: 'interiorColor',
  interior_seats: 'interiorSeats',
  interior_leather: 'interiorLeather',
  wheels: 'wheels',
  location_city: 'city',
  notes: 'notes',
  source_forum: 'forum',
} as const satisfies Record<string, keyof FormDefaults>;

/** The form's default values with anything the user submitted laid over them. Pure. */
export function defaultsFromSubmission(submitted: FormData | null, base: FormDefaults): FormDefaults {
  if (!submitted) return base;
  const text = Object.entries(TEXT_FIELDS).reduce<Partial<FormDefaults>>((acc, [field, key]) => {
    const value = submitted.get(field);
    return typeof value === 'string' ? { ...acc, [key]: value } : acc;
  }, {});
  const year = Number(submitted.get('model_year'));
  return { ...base, ...text, ...(Number.isInteger(year) && year > 0 ? { modelYear: year } : {}) };
}

type Action<S> = (prev: S, formData: FormData) => Promise<S>;
type Kept<S> = { state: S; submitted: FormData | null; round: number };

/**
 * `useActionState` that also returns the FormData of the last submission and a counter that
 * changes with every submission. Callers render their fields with
 * `key={round}` and `defaults={defaultsFromSubmission(submitted, base)}`: the fields remount
 * with the submitted values as their initial defaults, which React's reset then restores.
 * (A `<select>` ignores `defaultValue` changes after mount, so passing new defaults alone
 * is not enough.) The FormData stays on the client; the server action gets the same
 * arguments as before.
 */
export function useActionStateKeepingValues<S>(action: Action<S>, initial: S) {
  const [kept, run, isPending] = useActionState<Kept<S>, FormData>(
    async (prev, formData): Promise<Kept<S>> => ({
      state: await action(prev.state as S, formData),
      submitted: formData,
      round: prev.round + 1,
    }),
    { state: initial, submitted: null, round: 0 }
  );
  return [kept.state, run, isPending, kept.submitted, kept.round] as const;
}
