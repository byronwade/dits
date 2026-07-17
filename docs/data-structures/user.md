# User (The Identity)

**Maturity:** Design

Dits has no account, organization, team, role, permission, session, or remote identity model. Commit author identity currently comes from `DITS_AUTHOR_NAME` and `DITS_AUTHOR_EMAIL` with Git and OS fallbacks; advisory lock ownership uses a separate Git/OS lookup.

See [configuration reference](../user-guide/config-reference.md) and [`../STATUS.md`](../STATUS.md). Any serialized form not
explicitly governed by an accepted ADR and conformance corpus remains an implementation
detail.
