# Database Schema

**Maturity:** Design

The current Dits product does not depend on a hosted relational database. The former
multi-tenant repository, user, organization, billing, webhook, and audit tables belonged
to a proposed service that is not built by the active workspace.

Local repository state lives under `.dits/` and is described, with pre-1.0 limits,
by the [active architecture](../architecture/active-architecture.md),
[core concepts](../concepts.md), and
[manifest contract](../data-structures/manifest-spec.md).

A database schema can become Current only alongside an implemented service, migrations,
tenant-isolation tests, backup/restore procedures, and a supported deployment artifact.
