# Asset (The File Recipe)

**Maturity:** Historical

The former Asset type is not the current repository schema. Current file recipes are manifest entries, with storage-specific fields for Dits chunks, embedded Git blobs, and selected MP4 metadata. Use the manifest contract rather than the illustrative struct that previously appeared here.

See [manifest contract](manifest-spec.md) and [`../STATUS.md`](../STATUS.md). Any serialized form not
explicitly governed by an accepted ADR and conformance corpus remains an implementation
detail.
