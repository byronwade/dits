# Hosted Storage Layout

**Maturity:** Historical

The bucket, multi-tenant object-key, cloud tier, lifecycle, CDN, bloom-filter, and hosted
metadata layouts formerly described here belong to a retired backend design. Current
Dits stores local repository objects under `.dits` and has no managed cloud storage
service.

See [`../STATUS.md`](../STATUS.md), the
[active architecture](active-architecture.md), and
[core concepts](../concepts.md). Detailed formats remain implementation contracts until
an accepted ADR and conformance corpus make them public.
