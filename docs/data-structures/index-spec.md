# Index Format

**Maturity:** Current

The staging index is stored at `.dits/index` as JSON produced by the current Rust
`Index` type. It tracks canonical paths, status, hashes, size and metadata, chunk
references, storage strategy, and optional Git object IDs. The former DIDX binary
layout and extension registry were never implemented.

See [compatibility ADR](../adr/0003-pre-1.0-repository-compatibility.md) and [`../STATUS.md`](../STATUS.md). Any serialized form not
explicitly governed by an accepted ADR and conformance corpus remains an implementation
detail.
