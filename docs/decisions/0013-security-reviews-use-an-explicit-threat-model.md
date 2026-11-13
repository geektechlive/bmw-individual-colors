# 0013. Security reviews state their threat model, and the owner's own surfaces are trusted

Status: Accepted · Date: 2026-11-13

## Context

A design review rated "the admin token appeared in `/admin?token=` URLs" as critical, and the
token was rotated on that rating. The URL could only have been seen on the owner's own devices.
The default referrer policy sends cross-site requests only the origin, and the Worker's request
logs held no `token=` values. A review that never states who the attacker is will overrate risks
that only the owner could see, and can trigger disruptive changes to the owner's own credentials.

## Decision

The owner, 2026-11-13: every security review and findings write-up states its threat model first.

- **The attacker** is an anonymous internet user, or anyone holding only public data: the anon
  key, public pages, forum usernames.
- **Trusted:** the owner, the owner's devices and browser, and the owner's hosting, database and
  code-hosting accounts.
- **Rating:** before acting on a finding, list the real exposure channels and check each one, then
  rate severity against that model.
- **Credentials:** never rotate or change a credential the owner uses without asking first.

## Consequences

- Findings come with calibrated severity, and the owner's own access isn't disrupted by
  theoretical exposure.
- Data that only the owner can see is out of scope unless the owner says otherwise.
- Revisit if the project gains other maintainers or admins. They would then sit outside "trusted"
  by default.

## Evidence

- #32 (the rotation and its discussion), ADR 0011.
