/**
 * Public flagging (#31): validate the reason/note first (cheap, no side
 * effects), then Turnstile, then one atomic database call
 * (public.bmwic_flag_entry) that only flags visible entries, keeps one open
 * flag per reporter per entry, and caps open flags per entry.
 *
 * Pure (Turnstile, reporter hash and RPC injected). Wired up in src/app/actions.ts.
 */
import { validateFlagInput, type FlagReason } from './flag-validation';

export interface FlagRpcArgs {
  entryId: string;
  reason: FlagReason;
  note: string | null;
  reporterHash: string;
}

export interface FlagDeps {
  verifyTurnstile: (token: string) => Promise<boolean>;
  /** HMAC of the reporter's IP; the raw IP is never stored. */
  reporterHash: () => Promise<string>;
  rpc: (args: FlagRpcArgs) => Promise<{ status: string | null; error: unknown }>;
}

export type FlagResult = { ok: true } | { ok: false; error: string };

const STATUS_MESSAGES: Record<string, string> = {
  duplicate: "You've already reported this entry.",
  not_found: 'That entry is no longer in the registry.',
  too_many: 'This entry already has several open reports.',
};

export async function submitFlag(
  input: { id: unknown; reason: unknown; note: unknown; tsToken: unknown },
  deps: FlagDeps
): Promise<FlagResult> {
  const valid = validateFlagInput(input);
  if (!valid.ok) return valid;
  if (typeof input.tsToken !== 'string' || !(await deps.verifyTurnstile(input.tsToken))) {
    return { ok: false, error: 'The verification check failed. Please try again.' };
  }

  let reporterHash: string;
  try {
    reporterHash = await deps.reporterHash();
  } catch (e) {
    // Fail closed: without its secret the hash would be reversible to the IP.
    console.error('flagging: reporter hash unavailable', e);
    return { ok: false, error: "Couldn't send your report. Please try again." };
  }
  const { status, error } = await deps.rpc({ ...valid.value, reporterHash });
  if (error || status === null) {
    console.error('flagging: rpc failed', error);
    return { ok: false, error: "Couldn't send your report. Please try again." };
  }
  if (status === 'ok') return { ok: true };
  return { ok: false, error: STATUS_MESSAGES[status] ?? "Couldn't send your report. Please try again." };
}
