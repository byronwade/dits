# Core Concepts and Contracts

**Maturity:** Current

Current concepts are separated from explicitly labelled Experimental and Design sections.

This document describes the model implemented by the canonical Rust workspace.
It deliberately separates byte identity, storage deduplication, media structure,
and semantic edit identity. Earlier versions of this document described
unwired chunkers, selectable hash algorithms, SIMD implementations, network
services, and benchmark numbers as if they were active. Those claims are not
part of the current contract.

See [`STATUS.md`](STATUS.md) for the live feature boundary and
[`research/technical-foundations.md`](research/technical-foundations.md) for the
long-range design.

## 1. The core invariant

A Dits object is immutable. Its identifier is derived from its content. A
reader verifies content before trusting it.

That invariant gives Dits four properties:

1. Identical content can be reused instead of stored twice.
2. Corruption can be detected by recomputing the identifier.
3. Commits can refer to immutable history rather than mutable file locations.
4. Local and remote implementations can verify each other without trusting the
   storage provider.

Content addressing does **not** by itself provide authorization,
confidentiality, availability, provenance, or semantic understanding. Those are
separate layers.

## 2. Current object model

### Hash

The active engine uses a 32-byte BLAKE3 digest as its content address.

A hash answers “are these bytes exactly the same?” It does not answer “do these
frames look the same?”, “did these files come from the same source?”, or “is
this object authorized?”

### Chunk

A chunk is an immutable byte range with:

- its exact bytes,
- a BLAKE3 hash of those bytes, and
- an ordered position inside a file manifest.

Chunks are implementation units for storage and transfer. They are not
editorial frames, scenes, image tiles, or application-level records.

### File manifest entry

A manifest entry records the information needed to materialize one working-tree
path. Depending on storage strategy, it can reference Dits chunks, a Git object,
or media-specific metadata.

Important fields in the current code include:

- relative path,
- file mode and type,
- byte size,
- exact full-content hash,
- ordered chunk references,
- storage strategy,
- optional Git object ID, and
- optional MP4 metadata.

### Manifest

A manifest is the repository tree for a commit: a deterministic mapping from
paths to manifest entries.

Current writers and readers use deterministic JSON. The exact bytes are hashed,
verified before parsing, and stored under that content address. Earlier code
comments described a binary bincode manifest phase, but the canonical writer
has always emitted JSON; Dits therefore does not claim a binary-manifest
compatibility contract.

### Commit

A commit references a manifest and a parent commit and records author,
timestamp, and message metadata. Branches and tags are names that resolve to
commit hashes.

The commit graph gives Dits history. Content-defined chunks give it binary
reuse. Those are related but distinct mechanisms.

## 3. Content-defined chunking

### Why chunk boundaries depend on content

Fixed-size chunking loses reuse after an insertion near the beginning of a
file because every later offset moves. Content-defined chunking chooses
boundaries from a rolling content signal, allowing the chunker to resynchronize
after many localized insertions and deletions.

The active shared engine uses the upstream `fastcdc` crate. The repository does
not currently ship selectable Rabin, AE, Chonkers, keyed FastCDC, AVX-specific,
or io_uring chunking paths in the canonical ingest pipeline.

### Current profiles

The shared engine defines these profiles:

| Profile | Minimum | Average | Maximum | Intended use |
|---|---:|---:|---:|---|
| Default | 16 KiB | 64 KiB | 256 KiB | General binary data |
| Media | 64 KiB | 256 KiB | 1 MiB | Large media payloads |
| Project | 4 KiB | 16 KiB | 64 KiB | Smaller project/metadata files |
| Fast | 256 KiB | 1 MiB | 4 MiB | Lower metadata overhead |

These values are implementation defaults, not universal optima. A format,
workload, storage device, and network all influence the useful range.

### What CDC reuses well

Byte-level CDC is effective when most source bytes remain intact:

- appending data,
- inserting or deleting a bounded byte range,
- moving unchanged byte ranges,
- changing container metadata while preserving payload bytes,
- stream-copy trims near existing boundaries, and
- successive binary builds with large unchanged regions.

### What CDC cannot promise

CDC does not create similarity where the bytes no longer match.

It usually performs poorly for:

- video or audio re-encoding,
- lossy image recompression,
- encryption with randomized nonces,
- whole-file compression after a small source change,
- global color transforms on flattened images,
- archive formats whose member ordering or metadata changes globally, and
- generated files containing timestamps or nondeterministic ordering.

Therefore “small visual edit” does not imply “small byte delta.” Dits must
report byte reuse from measurement, not infer it from the editor’s intent.

## 4. Full-content hashes and chunk hashes

Dits currently computes both:

- a full-file content hash, used to identify the exact file bytes; and
- per-chunk hashes, used to reconstruct and deduplicate ranges.

The full-content hash protects file identity. The chunk list provides reusable
storage. A manifest must preserve both the ordered chunk references and the
expected total size.

Large binary ingest streams FastCDC chunks while updating the full BLAKE3
digest incrementally, so peak buffers track the chunker maximum rather than a
second complete in-memory copy of the file. Text and MP4-specialized paths may
still buffer whole files.

## 5. Hybrid text and binary storage

Dits uses two storage strategies in the active CLI.

### Git text objects

Text-like files can use libgit2 so they retain line-oriented diff, merge, and
blame behavior.

### Dits chunks

Large binary and media files use the Dits object store and content-defined
chunking.

### Hybrid files and projects

A creative project may contain text/XML metadata and binary payloads. “Hybrid”
means each representation is routed to the engine that can preserve its useful
semantics. It does not mean every individual file is always duplicated into
both stores.

Classification is a policy decision and must remain inspectable. Extension
alone is not a sufficient long-term classifier; content probing, size,
repository policy, and explicit overrides are needed.

## 6. Structure-aware media

A media container is not an undifferentiated byte string. MP4/ISOBMFF, for
example, contains typed boxes with metadata, sample tables, payload data, and
offsets.

The current MP4 path can separate selected structure from media payload and
patch offsets during reconstruction. This can improve reuse when container
metadata changes but encoded media bytes do not.

Structure-aware parsing has a strict safety rule:

> If Dits cannot prove that it can reconstruct the original contract for a
> format variant, it must fall back to opaque byte storage.

Support for one MP4 layout does not imply support for every MOV, fragmented MP4,
multiple-`mdat`, edit-list, large-offset, camera-vendor, or NLE-generated file.
Golden fixtures and byte/fidelity assertions define the real support matrix.

## 7. FACR and semantic media identity

**Maturity: Experimental.**

FACR explores frame-addressable content representation. It is the beginning of
a semantic layer above the byte CAS, not a replacement for exact originals.

A robust media model needs at least three identities:

1. **Encoded identity** — exact bytes of an imported or exported asset.
2. **Decoded identity** — exact canonical pixels or audio samples after a
   specified decode contract.
3. **Perceptual similarity** — a search/index score used to find candidate
   relationships.

Only exact hashes are object identities. Perceptual hashes can collide and can
change under innocuous transforms; they must never silently substitute one
master asset for another.

### Dits-owned edits

When Dits records trim, reorder, crop, grade, or composite operations as a
non-destructive edit graph, unchanged source objects remain referenced rather
than re-encoded. This is the strongest route to true media version control.

### External flattened exports

When an external NLE re-exports a timeline, even visually unchanged frames may
decode differently because of color conversion, resampling, codec decisions,
or metadata. Exact reuse may fall to zero. Dits can analyze similarity and
store optional residuals, but it must not advertise a byte-exact deduplication
result it did not measure.

### Interchange, not lock-in

The semantic layer should import and export established interchange concepts
where possible. OpenTimelineIO is a useful model for editorial timing and
references. OpenAssetIO is useful for resolving and publishing assets across
tools. OpenUSD is relevant for composed scene graphs. C2PA is relevant for
signed provenance and ingredient relationships.

Dits should own its immutable object graph and compatibility rules, not invent
a proprietary editing application or codec as its first move.

## 8. Deduplication metrics

“Deduplication ratio” is ambiguous unless the formula is stated. Dits
benchmarks should report at least:

- logical bytes represented,
- physical new bytes written,
- bytes already present,
- object and chunk counts,
- manifest/index overhead,
- compression and encryption mode,
- elapsed wall time,
- peak resident memory,
- read/write I/O, and
- corpus plus mutation recipe.

Useful derived values include:

```text
reuse ratio       = reused logical bytes / logical bytes processed
write amplification = physical bytes written / new logical bytes
storage factor    = physical stored bytes / logical represented bytes
```

Do not mix projected network savings with measured local storage reuse.

## 9. Object-store safety

The loose object store verifies chunk and blob checksums when reading. New
object writes are completed in a temporary file and published without
replacement so readers do not observe a partially written destination.

This is only the first durability layer. A mature store also needs:

- crash-recovery tests,
- concurrent-writer tests,
- directory and metadata durability policy,
- quarantine of corrupt objects,
- repair from another verified copy,
- pack/index checksums, and
- transactional ref updates.

Garbage collection must prove reachability from all protected roots before
removing an object.

## 10. Encryption and privacy

Content addressing leaks equality: observers who can see object identifiers or
access patterns may learn that two repositories contain the same bytes.

Dits should distinguish three modes:

1. **Plain verified CAS** — maximum deduplication, no confidentiality.
2. **Repository-key encryption** — confidentiality within a trust domain;
   cross-key deduplication is intentionally lost.
3. **Message-locked/convergent encryption** — preserves equality-based
   deduplication but leaks equality and can enable guessing attacks against
   predictable content.

Convergent encryption is a policy trade-off, not “encryption with no cost.”
Threat models and repository mode must be explicit.

Telemetry is independent from repository encryption. It is disabled by default
and must never include paths, argument values, machine identifiers, repository
names, or content.

## 11. Remote synchronization

**Maturity: Design. Network push/pull/fetch/P2P are not shipped contracts.**

The protocol should be defined by verifiable operations, not by a transport
brand:

1. Negotiate protocol and object-format versions.
2. Advertise refs and capabilities.
3. Determine missing immutable objects.
4. Transfer bounded streams with digest and length verification.
5. Commit objects to the local CAS only after verification.
6. Update refs with compare-and-swap semantics.
7. Detect divergence; never overwrite it as a side effect of “sync.”
8. Resume from verified object or range boundaries.

Bloom filters may reduce negotiation traffic, but they are advisory. False
positives must be detected by final object verification.

QUIC is a potential transport because independent streams reduce
head-of-line coupling and connections can survive address changes. The object
protocol should also be implementable over ordinary HTTP so the storage model
does not depend on one networking stack.

## 12. Virtual hydration

**Maturity: Experimental and feature-gated.**

A virtual filesystem can expose a large commit without materializing every
object. The read path maps a file offset to manifest ranges, obtains verified
objects from local or remote storage, and returns only requested bytes.

Correctness precedes latency:

- reads must match a fully materialized checkout,
- cache entries must be verified,
- missing remote support must fail explicitly,
- writes need copy-on-write isolation,
- eviction cannot remove protected dirty data, and
- unmount/crash behavior must be tested per platform.

“Partial clone” and “on-demand hydration” are not complete until a real remote
object source is wired to the same verification path.

## 13. Performance principles

Dits performance claims follow these rules:

- Bound memory independently of file size.
- Avoid duplicate full-file buffers.
- Avoid serializing into one format and probing another on every read.
- Batch tiny objects to reduce filesystem metadata overhead.
- Preserve verification when adding caching, mmap, direct I/O, or networking.
- Measure cold cache and warm cache separately.
- Compare identical fidelity and durability contracts.
- Store raw benchmark output with the commit and corpus recipe.

The optimization sequence is documented in
[`performance/engineering-plan.md`](performance/engineering-plan.md).

## 14. Current versus future summary

| Concept | Current state |
|---|---|
| BLAKE3 exact content IDs | Current |
| FastCDC byte chunking | Current |
| Loose local object store | Current |
| Local manifests, commits, branches, checkout | Current |
| Hybrid Git text storage | Current |
| MP4 structure-aware path | Current with a bounded support matrix |
| FACR frame/photo workflows | Experimental |
| FUSE mount | Experimental and feature-gated |
| Packfiles and multi-pack index | Design |
| Bounded-memory streaming ingest | Current for large classified binaries |
| Remote CAS protocol | Design |
| QUIC/P2P transfer | Scaffolding/design |
| Hosted REST/API/SDK platform | Historical/design, not current |
| C2PA/OTIO/OpenAssetIO/OpenUSD integration | Design |
| Public conformance suite | Design priority |

## 15. The stable mental model

```text
working file
  -> exact full-content identity
  -> content-defined byte chunks
  -> immutable file manifest
  -> immutable repository manifest
  -> commit graph
  -> optional media structure
  -> optional semantic edit and provenance graph
  -> optional verified remote transport
```

The lower layers must remain useful without the higher layers. Every higher
layer must preserve the ability to verify and reconstruct the exact objects it
references.
