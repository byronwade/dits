# FastCDC Chunking

**Maturity:** Current

This page documents the deterministic chunking engine in `packages/dits-core`.
Its internal representation is pre-1.0; use the checked-in tests, not this page,
as a cross-version compatibility guarantee.

## Current contract

Dits uses `fastcdc::v2020::FastCDC` to split eligible binary content into
variable-size chunks. Every chunk ID is the BLAKE3 digest of its exact bytes.
A `ChunkRef` records that digest, the byte offset in the original file, and the
chunk size.

For an empty input, the engine returns no chunks. An input no larger than the
configured minimum becomes one chunk. Larger inputs use the configured minimum,
target average, and maximum sizes. The default values are:

| Setting | Default |
| --- | ---: |
| Minimum | 16 KiB |
| Target average | 64 KiB |
| Maximum | 256 KiB |

Repository operations read these values from the repository-local chunking
configuration. See the [configuration reference](../user-guide/config-reference.md)
for the supported keys and validation boundary.

When the parallel feature is enabled, Dits computes FastCDC boundaries in order
and hashes the resulting slices in parallel while preserving reference order.

## Identity and reuse boundary

Chunk reuse requires byte-identical chunk contents. Content-defined boundaries can
limit how far a local insertion or deletion shifts later boundaries, but the
algorithm does not guarantee a deduplication percentage for any workload.
Re-encoding, recompression, encryption, metadata rewriting, or other byte changes
may change many or all chunk IDs even when material looks or sounds similar.

The chunker does not:

- compare perceptual or decoded-frame similarity;
- understand scene, timeline, image, or 3D semantics;
- make content from different users safe to co-deduplicate;
- prove a throughput, memory, or storage-savings figure without a benchmark.

## Verification

`packages/dits-core/tests/golden.rs` fixes a deterministic default-profile input
to exact offsets, sizes, and hashes. Unit and integration tests also cover
determinism, reconstruction, verification, and sequential/parallel agreement.

Run:

```bash
cargo test --locked -p dits-core
```

See [Core concepts](../concepts.md), [Manifest format](../data-structures/manifest-spec.md),
[Performance evidence](../performance/benchmarks.md), and
[Documentation status](../STATUS.md).
