# Migration Guide

**Maturity:** Current

Dits does not provide a Git/Perforce/DAM migration service, remote importer, history
converter, or compatibility guarantee for another system's metadata. Treat migration as
a reversible local evaluation:

1. Back up the source repository and assets.
2. Copy a bounded fixture into a new disposable directory.
3. Initialize Dits, add the fixture, and commit it.
4. Check out into a separate directory or local clone.
5. Compare bytes and run `dits fsck`.
6. Record any metadata, symlink, permission, or media-format loss before expanding scope.

Do not delete or rewrite the source system based on an alpha experiment. Network clone
and transfer commands are unavailable; local filesystem clone is the only current copy
workflow.

See [`../STATUS.md`](../STATUS.md),
[Getting Started](../user-guide/getting-started.md), and the
[pre-1.0 compatibility ADR](../adr/0003-pre-1.0-repository-compatibility.md).
