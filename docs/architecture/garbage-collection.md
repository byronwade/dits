# Garbage Collection Architecture

**Maturity:** Experimental

Destructive garbage collection is disabled. `dits gc --dry-run` reports candidate
unreachable objects but does not delete objects or locks. Complete reachability across
all object categories, quarantine, crash safety, and compatibility policy are
prerequisites for deletion.

See [`../STATUS.md`](../STATUS.md), the
[active architecture](active-architecture.md), and
[core concepts](../concepts.md). Detailed formats remain implementation contracts until
an accepted ADR and conformance corpus make them public.
