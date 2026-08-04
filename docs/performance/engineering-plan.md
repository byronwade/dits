# Performance Engineering Plan

**Maturity:** Design

The goal is not a single headline throughput number. The goal is predictable
resource use, verified reconstruction, good reuse on appropriate mutations,
fast interactive operations, and recoverability across supported repository
scales.

## 1. Performance contracts

Dits should eventually publish support envelopes rather than vague scale
claims.

Example contract shape:

```text
Given:
  format_version = 1
  chunk_profile = media
  worker_count <= N
  source file size = any size supported by the filesystem
  encryption mode = X

The add pipeline:
  uses at most base + N * bounded_buffer bytes of working memory,
  never publishes an index entry before all objects are verified,
  and reconstructs the exact source bytes.
```

A contract is valid only for the platforms and features tested.

## 2. Immediate findings

### 2.1 Remaining whole-file buffers

Large classified binaries (≥1 MiB) stream through FastCDC with incremental
BLAKE3 hashing, size/mtime mutation checks, and atomic index publication. Peak
buffers for that path track the chunker `max_size` rather than `file_size`.

Remaining file-sized memory pressure is concentrated in:

- text / small-binary paths that still `read` the whole file;
- MP4-specialized ingest, which can hold an extracted `mdat` payload and then
  chunk buffers from that payload; and
- media-specific duplicate buffers on experimental FACR/proxy paths.

Closing those remaining paths is the next ingest-memory priority.

### 2.2 Current-format parse misses

Current manifest and index writers emit JSON, while readers historically tried
bincode first. That creates a predictable failed parse on the normal path. The
index path also cloned the input before JSON decoding.

Readers should:

1. inspect a small format prefix or explicit version marker;
2. parse the current format directly;
3. invoke legacy readers only for recognized legacy encodings;
4. avoid ownership conversions when a borrowed slice is sufficient.

### 2.3 Loose-object metadata cost

One file per chunk is simple and useful early, but high object counts make
filesystem operations dominate:

- directory creation and lookup;
- inode allocation;
- backups and antivirus scans;
- cold directory walks;
- status, GC, and object counts;
- remote listing;
- small writes and journal traffic.

Packfiles are a scale feature, not only a compression feature.

### 2.4 Duplicate binary/library compilation *(resolved)*

The CLI binary now imports the canonical library modules instead of redeclaring
them. Keep CLI parsing, process setup, hooks, and telemetry in the binary; do
not reintroduce parallel module trees that permit type drift.

### 2.5 FACR temporary-file amplification

FACR video ingest decodes all frames into a temporary directory and then reads
them back into the frame store. Reconstruction writes all frames back to a
temporary directory before encoding.

This is robust for a prototype but amplifies local I/O and temporary capacity.

## 3. Bounded-memory ingest design

### 3.1 Pipeline

```text
file reader / mmap window
        ↓
incremental full-file BLAKE3
        ↓
streaming FastCDC boundary detector
        ↓
bounded chunk work queue
        ↓
hash / optional encrypt / store
        ↓
ordered chunk-reference collector
        ↓
transactional index publication
```

### 3.2 Memory target

Let:

- `Cmax` = configured maximum chunk size;
- `W` = number of storage workers;
- `Q` = bounded queued chunks;
- `M` = bounded metadata.

Target:

```text
peak working memory <= base + Cmax * (W + Q + small constant) + M
```

The target must not include `file_size`.

### 3.3 Reader choices

#### Buffered streaming

Advantages:

- portable;
- works on pipes and remote readers;
- explicit memory bound.

Risks:

- FastCDC library API may expect contiguous slices;
- boundary detection needs carry-over between windows.

#### Memory mapping

Advantages:

- no user-space full-file copy;
- easy range slicing;
- operating system manages paging;
- BLAKE3 and FastCDC can work over ranges.

Risks:

- a mutable/truncated source can fault or change during ingest;
- address-space pressure on constrained systems;
- network/FUSE filesystems vary;
- mapping is not the same as bounded physical memory.

Recommended path: implement a `ReadAt`/range abstraction and support both mmap
for stable local regular files and buffered streaming as the portable baseline.

### 3.4 Stable-source contract

Options:

1. acquire an advisory lock where meaningful;
2. record metadata before and after ingest;
3. include file identity, size, and modified time checks;
4. optionally re-read/hash if metadata changed;
5. fail without publishing the index if mutation is detected.

No source-stability heuristic is perfect across all filesystems. The contract
must state what is detected.

### 3.5 Ordered concurrency

Parallel workers may finish out of order. Chunk references must remain in source
order.

Use sequence numbers and a bounded reorder buffer. Never collect all payloads
solely to restore order.

### 3.6 Transaction state

Write provisional metadata under `.dits/transactions/<id>/`:

- source path and observed metadata;
- emitted object IDs and sequence;
- provisional manifest/index entry;
- phase marker.

After all objects are durable and the source contract passes, atomically update
the index and remove the transaction. Recovery can discard or resume incomplete
transactions.

## 4. MP4/ISOBMFF ingest

### 4.1 Parse headers, reference ranges

The parser should retain box type, size, offset, and required fields without
copying every payload.

For large payload boxes:

- keep source ranges;
- feed ranges to the chunk pipeline;
- store small structural boxes as blobs;
- validate checked offsets and sizes;
- cap nesting and table counts before allocation.

### 4.2 Reconstruction modes

Define separate contracts:

- **byte-exact:** output must hash to the imported original;
- **structurally equivalent:** selected metadata/layout can differ, but samples
  and declared semantics match;
- **fidelity equivalent:** decoded result meets a named objective threshold.

Do not use “round trip” without naming the contract.

### 4.3 Golden corpus

Every supported variant needs a fixture and assertion. At minimum:

- `moov` before and after `mdat`;
- `stco` and `co64`;
- multiple tracks;
- edit lists;
- multiple `mdat`;
- fragmented MP4 (`moof`);
- `free`, `skip`, `wide`, unknown/vendor boxes;
- phone/camera/screen-recorded files;
- FFmpeg and major NLE exports;
- malformed/truncated/oversized boxes.

## 5. Object-store write path

### 5.1 Immediate loose-object pattern

1. Derive final path from validated object ID.
2. Return already-present only under the immutable-object policy.
3. Create destination directory.
4. Write to a unique temporary file in that directory.
5. Flush/close.
6. Publish without replacing a competing immutable object.
7. Clean temporary files after errors.
8. Verify on read.

Directory `fsync` policy should be explicit because per-object syncing can
destroy throughput while omitting it changes crash durability.

### 5.2 Repair

`fsck` should:

- verify object path versus digest;
- detect truncated/invalid envelopes;
- quarantine corrupt files;
- rebuild indexes from pack records;
- find missing referenced objects;
- distinguish promised/missing from corrupt;
- optionally repair from another verified source.

### 5.3 Small-object packing

Suggested initial pack record:

```text
record header:
  kind
  encoding/compression/encryption
  decoded length
  encoded length
  object ID
payload
record checksum/authentication
```

Pack footer/index supports lookup without scanning.

### 5.4 Packing policy

Avoid one universal pack.

Potential classes:

- repository metadata and commits;
- small chunks;
- media frame/audio blocks;
- proxies/thumbnails;
- encrypted objects by key domain;
- cold archival objects.

Random-access media should not depend on long delta chains.

### 5.5 Multi-pack index

A multi-pack index maps object IDs across immutable packs, allowing background
packing and compaction without rewriting every existing pack.

Required tests:

- duplicate object in multiple packs;
- preferred/newest pack selection;
- missing pack;
- truncated index;
- index rebuild;
- concurrent reader during index swap;
- repack and old-pack retirement.

## 6. Repository metadata scale

### 6.1 Tree objects

One large manifest causes O(repository size) serialization for a one-file
change. Hierarchical tree objects limit rewriting to changed path ancestors.

Measure:

- commit creation versus path count;
- status versus dirty path count;
- sparse traversal;
- subtree diff;
- memory during manifest/tree load.

### 6.2 Index format

The working index needs:

- explicit magic/version;
- deterministic encoding;
- length/checksum;
- path ordering;
- optional path table/string deduplication;
- atomic replacement;
- corruption recovery from HEAD plus working tree;
- format-specific compatibility tests.

Use memory mapping only after the on-disk format and mutation model are stable.

### 6.3 Reachability index

GC should not repeatedly reconstruct every relationship from directory walks.
Maintain or build a checksummed reachability graph from commits/trees/manifests
to objects. Treat it as rebuildable cache, not authority.

## 7. FACR performance evolution

### 7.1 Pipe-based ingest

Replace frame-directory staging where practical:

```text
ffmpeg image2pipe/rawvideo
        ↓
bounded frame decoder
        ↓
canonicalization + exact digest
        ↓
optional encoder worker
        ↓
frame store + ordered manifest
```

Backpressure must prevent ffmpeg from outrunning storage.

### 7.2 Avoid raw-frame explosion

Raw 4K/8K frames are enormous. Do not keep multiple decoded frames per worker
without an explicit budget.

Choose:

- bounded frame count;
- tile streaming for high-resolution workflows;
- GPU memory accounting if hardware decode/encode is introduced;
- spill-to-disk policy with capacity preflight.

### 7.3 Rendition cache

Cache render/transcode outputs by a digest of:

- input object/graph IDs;
- tool and version;
- complete arguments;
- environment/container digest;
- color config;
- target fidelity profile.

A cache hit is valid only when the recipe is canonical and all dependencies are
included.

## 8. VFS and hydration

### 8.1 Read path

Map:

```text
(path, offset, length)
  -> file manifest
  -> extents
  -> verified local cache or remote object reader
  -> requested byte range
```

### 8.2 Cache policy

Measure:

- hit rate by bytes and requests;
- p50/p95/p99 first-byte latency;
- sequential and random reads;
- verification overhead;
- eviction churn;
- duplicate concurrent misses.

Coalesce concurrent reads for the same object/range.

### 8.3 Correctness gates

- compare mounted reads with full checkout hashes;
- inject missing/corrupt cache objects;
- unmount during writes;
- crash/restart;
- full disk;
- remote disconnect/resume;
- platform-specific rename/delete semantics.

## 9. Remote performance

### 9.1 Negotiation

Compare:

- explicit ID batches;
- sorted prefix/range exchange;
- Bloom filters;
- pack inventory;
- tree/commit reachability negotiation;
- split/splice plans.

Report false-positive recovery and round trips, not only filter size.

### 9.2 Transfer

Measure separately:

- small object batches;
- one large object;
- many parallel objects;
- high latency;
- packet loss;
- interrupted/resumed transfer;
- encrypted repository;
- already-present percentages;
- HTTP versus QUIC under identical semantics.

### 9.3 Ref update latency

Object transfer completion and branch publication are different metrics. A
remote push is complete only when the compare-and-swap ref transaction succeeds.

## 10. Benchmark harness

### 10.1 Result schema

Store machine-readable output such as:

```json
{
  "schema": 1,
  "commit": "...",
  "command": "dits add fixture",
  "profile": "release",
  "features": [],
  "platform": {},
  "filesystem": {},
  "corpus": {},
  "mutation": {},
  "metrics": {
    "wall_ms": 0,
    "cpu_ms": 0,
    "peak_rss_bytes": 0,
    "bytes_read": 0,
    "bytes_written": 0,
    "logical_bytes": 0,
    "new_object_bytes": 0,
    "reused_logical_bytes": 0,
    "object_count": 0
  }
}
```

### 10.2 Reproducibility

- deterministic generators where possible;
- content checksums for downloaded fixtures;
- no untracked local fixture substitution;
- warm-up policy;
- repeated runs and variance;
- raw samples retained;
- no comparison across different fidelity/durability modes.

### 10.3 CI tiers

#### Per pull request

- unit/property tests;
- small deterministic corpus;
- bounded-memory smoke;
- object integrity and round trip;
- benchmark correctness assertions;
- CLI docs check.

#### Scheduled

- representative real media;
- cold-cache benchmarks;
- crash injection;
- large object counts;
- cross-platform FUSE/media tests;
- network impairment matrix.

#### Release candidate

- full compatibility corpus;
- previous-release read/write matrix;
- migration;
- fsck/repair;
- pack repack/index rebuild;
- long-running soak.

## 11. Optimization order

1. Protect correctness with atomic publication and checksums.
2. Remove guaranteed parse misses and buffer clones.
3. Bound ingest memory.
4. Eliminate duplicate binary/library compilation.
5. Add trees and indexed reachability.
6. Add packs/multi-pack index.
7. Stream FACR media through bounded pipes.
8. Wire remote CAS over a simple transport.
9. Add QUIC/P2P only when protocol semantics are stable.
10. Tune SIMD, mmap, compression, batching, and GPU paths from profiles.

Micro-optimizing hashing before removing file-sized copies and metadata
amplification is the wrong order.

## 12. Acceptance gates

### Bounded ingest gate

- ingest a generated asset substantially larger than the configured memory
  budget;
- peak RSS remains inside the declared formula;
- exact checkout hash matches;
- interruption leaves no published incomplete index entry;
- retry reuses verified objects.

### Pack gate

- one million small objects can be looked up without one million loose files;
- pack corruption is detected;
- index rebuild reproduces mappings;
- random reads meet declared latency;
- repack preserves all object IDs.

### Media gate

- every fixture has a named reconstruction/fidelity contract;
- unsupported variants fall back safely;
- parser fuzzing produces no panics or unbounded allocations;
- FACR identity profiles are cross-tool reproducible.

### Remote gate

- receiver verifies every object;
- resume never accepts unverified partial data;
- divergence produces a conflict result;
- failed ref transaction leaves remote refs unchanged;
- HTTP and QUIC implementations pass the same protocol vectors.
