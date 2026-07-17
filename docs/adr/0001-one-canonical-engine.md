# ADR 0001: One Canonical Local-First Engine

**Maturity:** Current

Accepted ADRs govern new work, but they do not by themselves prove that every consequence
is implemented; implementation status remains authoritative.

- **Status:** Accepted
- **Date:** 2026-07-16

## Context

The repository previously contained two independently implemented products: the
feature-rich local CLI and a separate cloud/backend workspace with its own core,
chunkers, protocol, storage, CLI, database, cache, and worker crates.

The two paths shared no canonical engine. This created duplicate binaries,
conflicting architecture descriptions, a large inactive dependency surface,
and a risk that a future hosted service would write incompatible repositories.

The backend experiment was moved under `legacy/backend-crates`, but its
workspace dependencies still lived in the active root manifest.

## Decision

The canonical Dits product is:

```text
packages/dits-core
        +
apps/cli library and binary
```

The root Cargo workspace contains only those crates.

`legacy/backend-crates` is a self-contained nested workspace. It is preserved
for research but does not participate in the root build, dependency graph,
security audit, release, or definition of Dits object semantics.

Any future hosted service must import the canonical engine or implement a
published protocol and pass the same conformance vectors. It may not fork
hashing, chunking, manifests, commits, ref transactions, object verification,
or encryption envelopes.

## Consequences

Positive:

- one binary and one trust core;
- active dependency audits describe the shipped product;
- historical research remains reproducible;
- documentation can state a clear product boundary;
- a server can evolve independently without redefining repositories.

Costs:

- legacy code may require separate maintenance to build;
- reusable backend ideas must be extracted intentionally;
- some older deployment/API documents become Design or Historical.

## Enforcement

- Root `Cargo.toml` lists only `apps/cli` and `packages/dits-core`.
- `legacy/backend-crates/Cargo.toml` owns backend-only dependencies.
- CI for the canonical product runs from the root workspace.
- A future legacy-research workflow, if added, runs from the nested workspace
  and is non-release-blocking until intentionally revived.
- Architecture reviews reject a second canonical object model.
