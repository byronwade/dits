# Encryption and Key Management

**Maturity:** Design

The early repository-encryption experiment is disabled because it did not cover embedded Git content or every metadata path. Encryption initialization, login, and password changes fail closed, and repositories containing the experimental keystore do not open normally. Remote key services, sharing, rotation, recovery, and E2EE remain Design.

See [`../STATUS.md`](../STATUS.md), the
[active architecture](active-architecture.md), and
[core concepts](../concepts.md). Detailed formats remain implementation contracts until
an accepted ADR and conformance corpus make them public.
