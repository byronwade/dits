# Chunk (The Atom)

**Maturity:** Current

A chunk is a byte slice identified by the BLAKE3 digest of those exact bytes. A manifest ChunkRef records its hash, original offset, and size. Keyframe flags and perceptual identity are not part of the generic chunk identity.

See [core concepts](../concepts.md) and [`../STATUS.md`](../STATUS.md). Any serialized form not
explicitly governed by an accepted ADR and conformance corpus remains an implementation
detail.
