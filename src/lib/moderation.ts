/**
 * Admin moderation (#31/#32). The authorization check runs first and nothing
 * touches the database without it; each op is one atomic database function
 * (public.bmwic_moderate: dismiss / delete+resolve flags / restore).
 *
 * Pure (session check and RPC injected) so tests can prove an unauthorized
 * call never reaches the database. Wired up in src/app/actions.ts.
 */

import type { BmwEntry } from '../types';

/** One open flag as read for /admin (bmwic_flags joined to its entry). */
export interface OpenFlagRow {
  id: string;
  reason: string;
  note: string | null;
  created_at: string;
  entry: BmwEntry | null;
}

export interface FlaggedEntry {
  entry: BmwEntry;
  flags: Array<{ id: string; reason: string; note: string | null; created_at: string }>;
}

/** Groups open flags per entry, entries ordered by their newest flag, capped. */
export function groupOpenFlags(rows: OpenFlagRow[], limit = 100): FlaggedEntry[] {
  const byEntry = new Map<string, FlaggedEntry>();
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const { entry, ...flag } of sorted) {
    if (!entry) continue;
    const group = byEntry.get(entry.id) ?? { entry, flags: [] };
    byEntry.set(entry.id, { ...group, flags: [...group.flags, flag] });
  }
  return [...byEntry.values()].slice(0, limit);
}

export const MODERATION_OPS = ['dismiss', 'delete', 'restore'] as const;
export type ModerationOp = (typeof MODERATION_OPS)[number];

export interface ModerationDeps {
  isAuthorized: () => Promise<boolean>;
  rpc: (entryId: string, op: ModerationOp) => Promise<{ status: string | null; error: unknown }>;
}

export type ModerationResult = { ok: true; op: ModerationOp } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isOp(value: unknown): value is ModerationOp {
  return typeof value === 'string' && (MODERATION_OPS as readonly string[]).includes(value);
}

export async function moderate(
  input: { op: unknown; id: unknown },
  deps: ModerationDeps
): Promise<ModerationResult> {
  if (!(await deps.isAuthorized())) return { ok: false, error: MODERATION_ERRORS.session };
  if (!isOp(input.op)) return { ok: false, error: MODERATION_ERRORS.unknownOp };
  if (typeof input.id !== 'string' || !UUID.test(input.id)) return { ok: false, error: MODERATION_ERRORS.badId };

  const { status, error } = await deps.rpc(input.id, input.op);
  if (error || status === null) {
    console.error('moderation: rpc failed', input.op, error);
    return { ok: false, error: MODERATION_ERRORS.failed };
  }
  if (status === 'not_found') return { ok: false, error: MODERATION_ERRORS.notFound };
  if (status !== 'ok') return { ok: false, error: MODERATION_ERRORS.unknownOp };
  return { ok: true, op: input.op };
}

const MODERATION_ERRORS = {
  session: 'Your admin session has expired. Please sign in again.',
  unknownOp: 'Unknown action.',
  badId: 'That entry could not be found.',
  failed: 'Could not update the entry. Please try again.',
  notFound: 'That entry no longer exists or was already changed.',
} as const;

/**
 * /admin shows `?error=` only when it is one of these exact messages, so a
 * crafted link can't put arbitrary text in the admin's alert box.
 */
export function isKnownModerationError(message: string | undefined): boolean {
  return typeof message === 'string' && (Object.values(MODERATION_ERRORS) as string[]).includes(message);
}
