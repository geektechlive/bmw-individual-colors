/**
 * One structured log line per Worker request (#25). Workers telemetry records
 * CPU per request but not which cache layer answered it; this line does, so a
 * CPU regression can be attributed to HIT/MISS/BYPASS by request kind.
 * Query strings are never logged: /admin and /edit links can carry tokens.
 *
 * Pure: no Workers-runtime imports, so it is unit-testable in Node.
 */
import { ogSlug } from './og-cache';

type RequestKind = 'og' | 'action' | 'rsc' | 'page';

function requestKind(request: Request, path: string): RequestKind {
  if (ogSlug(path) !== null) return 'og';
  if (request.headers.has('next-action')) return 'action';
  if (request.headers.has('rsc')) return 'rsc';
  return 'page';
}

export function requestLogLine(request: Request, response: Response, colo: string | null): string {
  const url = new URL(request.url);
  return JSON.stringify({
    msg: 'request',
    kind: requestKind(request, url.pathname),
    method: request.method,
    path: url.pathname,
    ...(url.search ? { query: true } : {}),
    status: response.status,
    cache: response.headers.get('x-og-cache') ?? response.headers.get('x-edge-cache'),
    colo,
  });
}
