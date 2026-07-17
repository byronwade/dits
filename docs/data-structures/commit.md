# Commit (The Snapshot)

**Maturity:** Current

A commit references a manifest hash, primary and optional merge parents, message, author, committer, and timestamp. Its content ID uses the versioned framed identity described by ADR 0004. Rust serialization is still an implementation detail rather than a public interchange contract.

See [commit identity ADR](../adr/0004-versioned-commit-identity.md) and [`../STATUS.md`](../STATUS.md). Any serialized form not
explicitly governed by an accepted ADR and conformance corpus remains an implementation
detail.
