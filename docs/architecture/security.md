# Security Architecture

**Maturity:** Current

Current security behavior is local path/ref validation, content verification, advisory locks, audit-log inspection, and fail-closed handling of disabled encryption and remote transfer. Authentication, authorization, tenant isolation, hosted audit policy, remote lock leases, and secure public serving are not Current.

See [`../STATUS.md`](../STATUS.md), the
[active architecture](active-architecture.md), and
[core concepts](../concepts.md). Detailed formats remain implementation contracts until
an accepted ADR and conformance corpus make them public.
