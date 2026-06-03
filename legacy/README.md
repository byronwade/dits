# legacy/ — quarantined code (reversible)

## backend-crates/
The former `apps/cli/crates/*` workspace: a separate "SaaS backend" vision
(`dits-api`, `dits-db`, `dits-worker`, `dits-storage`, `dits-protocol`, `dits-sdk`,
`dits-cache`, `dits-signal`, `dits-chunker`, `dits-cli`). It shared no code with the
canonical local-first engine at `apps/cli/` and was largely stubbed (worker job
processing was a TODO; 9 chunking algorithms were dead code never wired into any
ingest path; the real engine uses the upstream `fastcdc` crate).

Quarantined 2026-06-02 to make `apps/cli` the single canonical `dits` binary and
remove build ambiguity. Nothing was deleted — restore with `git mv legacy/backend-crates apps/cli/crates`
and re-add the members to the root `Cargo.toml`.

If a backend is built later, it should depend on `apps/cli`'s engine as a library,
not fork it.
