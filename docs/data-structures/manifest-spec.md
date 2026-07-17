# Manifest Format Contract

**Maturity:** Current

This is current local behavior, not a frozen public interchange standard.

This document describes the manifest bytes written and read by the canonical
Rust CLI today. It replaces the earlier aspirational `MANI` binary-header
design, which was never implemented.

See [`../STATUS.md`](../STATUS.md) for the product boundary and
[`../adr/0002-exact-cas-semantic-media-graph.md`](../adr/0002-exact-cas-semantic-media-graph.md)
for the separation between byte-exact storage and the planned semantic graph.

## Purpose

A manifest is the complete file tree referenced by a Dits commit. It answers:

- which relative paths belong to the snapshot;
- whether each path is a regular file, directory, or symbolic link;
- which storage strategy owns the content;
- which chunks or Git object reconstruct the file; and
- which optional MP4 metadata is needed for exact reconstruction.

A manifest is not a dependency graph, authorization record, remote protocol,
or semantic edit description. Those contracts must remain separate.

## Canonical representation

The current representation is pretty-printed UTF-8 JSON produced by
`Manifest::to_json`. The top-level `entries` field is a Rust `BTreeMap`, so
paths are serialized in lexical order and identical manifests produce
identical bytes with the same dependency versions.

The writer does not emit a magic header, compression envelope, timestamp,
signature, parent-manifest delta, or bincode payload. The reader accepts only
the JSON representation. This is deliberate: older comments referred to a
binary phase, but the canonical writer has always stored JSON.

The format is locally deterministic, but it is not frozen for independent
implementations yet. Before Dits declares a stable interchange format, it must
add an explicit schema version, canonical-JSON rules, compatibility fixtures,
resource limits, and cross-language conformance tests.

## Object identity and location

The writer performs these steps:

1. Serialize the manifest to UTF-8 JSON.
2. Compute the BLAKE3 digest of the exact serialized bytes.
3. Store the bytes immutably at
   `.dits/objects/manifests/<first-two-hex>/<remaining-hex>`.
4. Return the 32-byte digest as the manifest ID.

The reader recomputes the digest before parsing. A mismatch returns a checksum
error; invalid UTF-8 or JSON returns a parsing error. It then rejects a map key
that differs from its embedded entry path and rejects non-canonical, absolute,
or escaping repository paths. Readers never trust an object merely because it
exists at a hash-shaped path.

## Current schema

The Rust definitions in
[`../../apps/cli/src/core/manifest.rs`](../../apps/cli/src/core/manifest.rs) are
the implementation authority. The JSON shape is equivalent to:

```json
{
  "entries": {
    "media/shot-010.mov": {
      "path": "media/shot-010.mov",
      "mode": "Regular",
      "file_type": "Regular",
      "symlink_target": "",
      "size": 1048576,
      "content_hash": [0, 1, 2],
      "chunks": [
        {
          "hash": [0, 1, 2],
          "offset": 0,
          "size": 262144
        }
      ],
      "storage": "DitsChunk"
    }
  }
}
```

The shortened arrays above illustrate the shape only. A serialized `Hash`
contains exactly 32 byte values.

### Manifest fields

| Field | Type | Contract |
|---|---|---|
| `entries` | object keyed by path | Complete snapshot tree in lexical path order |

### Entry fields

| Field | Type | Contract |
|---|---|---|
| `path` | string | Repository-relative path; must match the containing map key |
| `mode` | enum | `Regular`, `Executable`, or `Symlink` |
| `file_type` | enum | `Regular`, `Symlink`, `Directory`, or `Other` |
| `symlink_target` | string | Empty for non-symlinks |
| `size` | unsigned integer | Exact materialized byte length |
| `content_hash` | 32-byte array | BLAKE3 digest of the complete file bytes |
| `chunks` | array | Ordered chunk references; empty for `GitText` |
| `mp4_metadata` | object or omitted | Structure needed for supported MP4 reconstruction |
| `storage` | enum | `GitText`, `DitsChunk`, or `Hybrid`; defaults to `DitsChunk` when absent |
| `git_oid` | string or omitted | Git blob OID for `GitText` or `Hybrid` entries |

### Chunk references

Each chunk reference records a BLAKE3 `hash`, byte `offset`, and byte `size`.
References are ordered by file position. Materialization must verify the chunk
object and the final `content_hash`; checking only one of those levels is not
enough.

## Required validation

Code that creates, imports, repairs, or eventually receives a manifest from a
remote must reject the manifest unless all of these conditions hold:

1. The object digest matches the exact manifest bytes.
2. Every map key equals its entry's `path`.
3. Every path is relative, normalized, and contained by the repository root.
4. No two normalized paths collide, including platform-specific case or Unicode
   collisions when relevant.
5. Chunk offsets are ordered, non-overlapping, and consistent with file size.
6. Required chunks or Git objects exist and pass their own integrity checks.
7. The reconstructed file digest equals `content_hash`.
8. Storage-specific fields agree: for example, `GitText` requires a valid
   `git_oid` and must not rely on Dits chunks.
9. Counts, nesting depth, path length, string length, and total decoded size are
   bounded before the format is accepted from untrusted sources.

The current local object reader enforces items 1-3. `dits fsck` additionally:

- verifies contiguous chunk offsets and each recorded chunk size;
- loads referenced chunks and checks their content IDs;
- loads referenced embedded-Git blobs;
- loads referenced MP4 `ftyp`, `moov`, and other stored atom blobs, including
  recorded `moov` and `mdat` sizes where applicable; and
- verifies reconstructed aggregate size and `content_hash` for regular
  chunk-backed and Git-backed entries.

Cross-platform case/Unicode collision policy, complete storage-field
consistency, resource limits, and a stable untrusted-input envelope remain
format-freeze work. Structured MP4 validation checks its component objects and
payload size; the current fsck path does not claim a universal full-container
reconstruction proof for every MP4 shape.

## Evolution policy

Until the format is frozen:

- the CLI version and repository data are developed together;
- schema changes require migration tests and a status update;
- no documentation may promise compatibility with an unwritten binary format;
- no remote protocol may expose raw Rust serialization as a public contract;
- fixtures should include empty trees, symlinks, executable modes, Git-backed
  text, chunked binary files, MP4 metadata, malformed paths, missing chunks,
  and checksum failures.

The intended stable design should use an explicit versioned envelope and a
canonical encoding with independently reproducible test vectors. Choosing JSON,
CBOR, Protobuf, or another encoding is a future ADR decision; it is not implied
by the current local JSON file.

## Implementation references

- `apps/cli/src/core/manifest.rs` — schema and deterministic path map
- `apps/cli/src/store/objects.rs` — hashing, immutable storage, and loading
- `apps/cli/src/store/repository.rs` — snapshot and materialization behavior
- `apps/cli/src/commands/repo/fsck.rs` — repository integrity checks
- `packages/dits-core/src/chunk.rs` — shared chunk-reference definition
