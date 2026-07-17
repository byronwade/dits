# REST API Reference

**Maturity:** Design

Dits does not currently publish the hosted API, webhook system, stable error registry,
or complete repository wire protocol assumed by the former material on this page. The
runnable-looking endpoints, tokens, payloads, and protocol exchanges were design
sketches, not a supported integration contract.

The local `dits serve` utility is unauthenticated, intended only for trusted or
isolated networks, and does not implement safe repository exchange or remote ref
transactions. Network clone is unavailable, while `push`, `pull`, `fetch`,
and `sync` fail closed.

See [`../STATUS.md`](../STATUS.md), the
[current CLI reference](../user-guide/cli-reference.md), and the
[active architecture](../architecture/active-architecture.md). Any future public API
requires versioning, authentication, authorization, resource limits, conformance
fixtures, and an accepted protocol decision.
