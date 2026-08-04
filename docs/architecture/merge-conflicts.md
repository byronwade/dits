# Merge and Conflict Resolution

**Maturity:** Experimental

Local merge and related history commands are implemented, but binary and hybrid
conflict handling is bounded. `restore --ours/--theirs` fails closed with a
nonzero error and changes no working-tree or index files. Hosted review,
semantic NLE merge, remote policy, and universal media conflict resolution
remain Design.

See [`../STATUS.md`](../STATUS.md), the
[active architecture](active-architecture.md), and
[core concepts](../concepts.md). Detailed formats remain implementation contracts until
an accepted ADR and conformance corpus make them public.
