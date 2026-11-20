// The source line on a paint page (#93, ADR 0019): where the paint's name comes from.
// Pure, so the copy is unit-tested. Data is the generated paint-reference.ts.

import { PAINT_REFERENCE, type PaintReference } from './paint-reference';

/** The public page BMW's paint list backs. */
export const BMW_PAINT_LIST_URL = 'https://individual.bmw-m.com/en-US/colors';

const UNVERIFIED_STATEMENT = "Not in BMW's paint list; name as owners gave it.";

const SOURCE_LABELS = {
  bmw: 'BMW Individual',
  archived: 'BMW visualizer, archived',
  'us-doc': 'BMW NA Ordering Guide, M3 (G80) MY2022',
} as const;

/** The reference for a listed paint name, own keys only (names come from free text). */
export function paintReference(name: string): PaintReference | null {
  return Object.hasOwn(PAINT_REFERENCE, name) ? PAINT_REFERENCE[name] : null;
}

export interface PaintSourceLine {
  /** true when BMW (or a BMW document) names the paint; false for names kept as owners typed them. */
  verified: boolean;
  /** BMW paint code, e.g. "P28"; null when unverified. */
  code: string | null;
  /** Link text and target of "Name from ..."; null when unverified. */
  sourceLabel: string | null;
  sourceUrl: string | null;
  /** Shown instead of the source for an unverified paint. */
  statement: string | null;
  note: string | null;
  noteSource: string | null;
  noteUrl: string | null;
}

export function paintSourceLine(name: string): PaintSourceLine {
  const ref = paintReference(name);
  if (!ref || ref.source === 'unverified') {
    return {
      verified: false,
      code: null,
      sourceLabel: null,
      sourceUrl: null,
      statement: UNVERIFIED_STATEMENT,
      note: ref?.note ?? null,
      noteSource: ref?.noteSource ?? null,
      noteUrl: ref?.noteUrl ?? null,
    };
  }
  return {
    verified: true,
    code: ref.code ?? null,
    sourceLabel: SOURCE_LABELS[ref.source],
    sourceUrl: ref.source === 'bmw' ? BMW_PAINT_LIST_URL : (ref.url ?? BMW_PAINT_LIST_URL),
    statement: null,
    note: ref.note ?? null,
    noteSource: ref.noteSource ?? null,
    noteUrl: ref.noteUrl ?? null,
  };
}
