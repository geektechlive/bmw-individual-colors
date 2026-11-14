// Why a submission or edit was turned away (#59). Real users failed to submit in November
// 2026 and nothing recorded why. One JSON line per rejection, reason only: no form values,
// no username, no IP (the request log line already carries path, colo and cache result).
// Pure, so it is unit-testable; the server actions call console.log(rejectionLogLine(...)).

export type SubmissionAction = 'submit' | 'update' | 'delete';

/** The validation messages validateEntryInput returns, by the field they are about. */
const VALIDATION_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ['Model year', 'model_year'],
  ['Body style', 'body_style'],
  ['Transmission', 'transmission'],
  ['Individual color', 'ext_color'],
  ['Forum username', 'forum_username'],
  ['Notes', 'notes'],
];

/** "validation:<field>", or "validation:other". Never includes the message text itself. */
export function validationReason(message: string): string {
  const hit = VALIDATION_PREFIXES.find(([prefix]) => message.startsWith(prefix));
  return `validation:${hit ? hit[1] : 'other'}`;
}

export function rejectionLogLine(action: SubmissionAction, reason: string): string {
  return JSON.stringify({ msg: 'submission rejected', action, reason });
}

export function logRejection(action: SubmissionAction, reason: string): void {
  console.log(rejectionLogLine(action, reason));
}
