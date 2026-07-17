# Plugin SDK Documentation

**Maturity:** Design

Dits does not expose or publish a supported plugin SDK, registry, sandbox, ABI, manifest
contract, or lifecycle API. Older examples were an extensibility proposal rather than
runnable integration guidance.

Current extension points are repository-local executable hooks documented by
`dits hooks --help`; hooks are not a stable in-process SDK. See
[`../STATUS.md`](../STATUS.md) and the
[active architecture](../architecture/active-architecture.md).

A plugin SDK needs an accepted isolation and compatibility design, version negotiation,
fixtures, and a published package.
