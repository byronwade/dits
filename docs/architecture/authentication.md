# Authentication and Authorization Architecture

**Maturity:** Design

Dits has no remote authentication, account, organization, role, permission, token, OAuth, or multi-user authorization system. Local commit identity and advisory lock ownership are not authentication. The local object server is unauthenticated and must remain on trusted or isolated networks.

See [`../STATUS.md`](../STATUS.md), the
[active architecture](active-architecture.md), and
[core concepts](../concepts.md). Detailed formats remain implementation contracts until
an accepted ADR and conformance corpus make them public.
