# Local Storage Format

**Maturity:** Current

The current repository combines local refs and metadata, JSON manifests and index state, content-addressed Dits objects, and an embedded Git object database for routed text content. The former packfile, LFS, cache database, remote-tracking, and DIDX layouts were not implemented as specified.

See [`../STATUS.md`](../STATUS.md), the
[active architecture](active-architecture.md), and
[core concepts](../concepts.md). Detailed formats remain implementation contracts until
an accepted ADR and conformance corpus make them public.
