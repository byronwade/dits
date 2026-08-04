# Branching Model

**Maturity:** Current

Local branches, detached HEAD, tags, merge parents, reflog, checkout, switch,
merge, rebase, and related history commands are implemented. Reflog recording
covers commit and checkout; other ref-changing commands may not yet append
entries. Branch protection, approvals, server-side policy, remote tracking
coordination, and pull-request workflows are not Current.

See [`../STATUS.md`](../STATUS.md), the
[active architecture](active-architecture.md), and
[core concepts](../concepts.md). Detailed formats remain implementation contracts until
an accepted ADR and conformance corpus make them public.
