# `legacy/` — quarantined code (reversible)

## `backend-crates/`

This directory contains the former `apps/cli/crates/*` workspace: a separate
SaaS-backend experiment (`dits-api`, `dits-db`, `dits-worker`, `dits-storage`,
`dits-protocol`, `dits-sdk`, `dits-cache`, `dits-signal`, `dits-chunker`, and
`dits-cli`).

It shared no code with the canonical local-first engine at `apps/cli/` and was
largely stubbed: worker job processing remained a TODO, multiple chunking
algorithms were not wired into ingest, and the production CLI used the upstream
`fastcdc` crate instead.

The code was quarantined on 2026-06-02 to make `apps/cli` the single canonical
`dits` binary and remove build ambiguity. It remains available for historical
research.

The legacy crates now have their own nested workspace:

```bash
cd legacy/backend-crates
cargo metadata
```

This keeps cloud/backend-only dependencies out of the active root workspace
while preserving the experiment in a reproducible boundary.

A future hosted service should import the canonical engine as a library. It
must not fork storage formats, chunking behavior, commit semantics, or object
verification into a second implementation.
