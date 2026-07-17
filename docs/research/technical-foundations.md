# Dits Technical Foundations: Deep Architecture Review and Research Agenda

**Maturity:** Design and research  
**Review date:** 2026-07-16  
**Canonical implementation reviewed:** `apps/cli`, `packages/dits-core`  
**Historical implementation reviewed:** `legacy/backend-crates`

This document is an architecture decision aid, not a claim that every described
component is implemented.

## Executive conclusion

Dits should not try to win by becoming “Git LFS with a faster upload,” by
reviving a parallel SaaS backend, or by inventing a proprietary video codec
before it has a stable object model.

The strongest technical direction is:

> **An open, local-first, verifiable media object graph: exact byte history at
> the trust core; structure-aware media objects above it; semantic edit,
> rendition, dependency, and provenance graphs above that; transport and hosted
> compute as optional services over the same immutable objects.**

This direction preserves the current engine’s real strengths while addressing
the reason generic byte chunking alone cannot version modern media workflows.

The revolutionary product is not merely “deduplicate large files.” It is the
ability to answer, reproducibly:

- Which exact source bytes existed?
- Which structural media components changed?
- Which frames, samples, layers, timeline ranges, or dependencies changed?
- Which operations produced a rendition?
- Which objects must move to reproduce or review the result?
- Which claims are signed, and which are only local metadata?
- Can another implementation independently verify the answer?

## 1. Repository-wide assessment

### 1.1 What is already valuable

The canonical Rust workspace contains a credible local foundation:

- BLAKE3-addressed immutable objects with verification on read.
- FastCDC-based chunking and exact reconstruction.
- Manifests, commits, refs, branches, status, diff, checkout, merge, and other
  local VCS behavior.
- Hybrid libgit2 storage for text and Dits storage for binary content.
- Structure-aware MP4/ISOBMFF code.
- Local locks, encryption, dependency/metadata inspection, lifecycle tools,
  proxy/segment experiments, FACR experiments, and a FUSE feature.
- A meaningful test and benchmark surface.

This is the asset to protect. A future server must depend on it rather than
reimplementing it.

### 1.2 Primary drift pattern

The repository accumulated documents and modules from several products at
once:

1. a local binary VCS;
2. a hosted control plane;
3. a P2P transfer product;
4. a virtual media filesystem;
5. an editor/semantic media system;
6. an asset-management platform;
7. a protocol and SDK ecosystem.

Those can be layers of one long-term system, but they cannot all be described
as current. The architecture must have one trust core and explicit maturity
boundaries.

### 1.3 Highest-priority engineering findings

| Priority | Finding | Consequence | Required response |
|---|---|---|---|
| P0 | Large-file ingest materializes the full file and copied chunks; MP4 ingest can duplicate the payload again. | Peak memory grows with asset size and can approach multiple file copies. | Implement bounded-memory streaming or mmap range ingest with backpressure and crash-safe staging. |
| P0 | Loose object writes historically targeted final paths directly. | A crash or concurrent reader can observe a partial object. | Stage beside the destination and publish without replacement; add crash/concurrency tests. |
| P0 | Real media-format coverage lacks a broad golden corpus. | A “supported MP4” claim can exceed tested layouts and risk user footage. | Build licensed/generated fixtures from cameras, phones, screen recorders, FFmpeg, Resolve/Premiere/FCP exports, fragmented MP4, multiple `mdat`, `co64`, edit lists, and malformed inputs. |
| P1 | Current JSON writers were paired with bincode-first readers in the manifest and index paths. | Every normal uncached read pays a failed parse; one path also clones the buffer. | Detect the current format first; retain explicit legacy readers behind a version marker. |
| P1 | The binary redeclares source modules also compiled by the library. | Longer builds, duplicate codegen, binary/library type drift, and confused visibility boundaries. | Make `main.rs` consume the library crate; keep CLI parsing/printing in the binary. |
| P1 | One-file-per-object storage scales poorly at high object counts. | Metadata I/O, directory walks, backup overhead, GC time, and inode pressure dominate. | Add versioned packfiles, checksummed indexes, and a multi-pack index. |
| P1 | Telemetry was documented as opt-in but its config keys were not supported; its event queue could re-lock itself; machine IDs contributed to identifiers. | Feature was effectively inert and privacy/correctness claims were inaccurate. | Use typed config, random IDs, documented schema, short lock scopes, and no raw arguments/paths. |
| P2 | Remote commands and P2P are scaffolding rather than one coherent protocol. | Implementing transports independently would create incompatible sync semantics. | Specify object negotiation, verification, resume, and ref transactions before choosing transports. |
| P2 | Documentation contains unmeasured performance and capacity claims. | Credibility degrades and regressions cannot be detected. | Require corpus, command, commit, hardware, raw output, and formula for every measured claim. |
| P2 | Hosted-service research remains mixed with current docs. | Contributors solve the wrong system and dependencies leak back into the core. | Keep the legacy backend in a nested workspace and classify hosted docs as Design/Historical. |

## 2. External systems: what to adopt and what not to copy

### 2.1 Git

Git demonstrates the value of a tiny immutable object model, a Merkle-like
commit/tree graph, atomic refs, loose objects for simplicity, and packfiles plus
indexes for scale.

Adopt:

- immutable object IDs,
- small stable object kinds,
- append-oriented packs,
- delta/index separation,
- checksums and fan-out indexes,
- multi-pack lookup,
- atomic compare-and-swap ref updates,
- plumbing/porcelain separation, and
- protocol capability negotiation.

Do not copy blindly:

- SHA-1 compatibility constraints,
- assumptions optimized for source text and many small blobs,
- delta choices that require reconstructing long chains for random media reads,
- a format whose extension story is tied to Git object headers, or
- an opaque “smart server” whose behavior cannot be reproduced locally.

### 2.2 Git LFS and git-annex

Git LFS keeps small pointer files in Git and stores large payloads elsewhere.
git-annex similarly separates Git history from content availability and tracks
where content can be obtained.

Adopt:

- explicit indirection between version metadata and large objects,
- content availability as a first-class state,
- hydration policies,
- clean/smudge or filter-process integration where useful, and
- the ability to know an object without possessing it.

Dits should go further by making chunking, media structure, exact
reconstruction, semantic relationships, and verification part of its own open
model rather than treating the large asset as one external opaque blob.

### 2.3 Hugging Face Xet

Xet is the most important direct technical comparison for Dits. Its published
system combines Git compatibility with content-defined chunking, a
content-addressed store, cross-file deduplication, and range reconstruction. Its
core implementation is open source in Rust.

Adopt:

- protocol and format documentation as part of the product;
- Git interoperability where it reduces migration cost;
- chunk-level reconstruction that does not require whole-file hydration;
- clean separation between repository metadata and scalable object storage; and
- realistic acknowledgment that CDC and a CAS are established primitives.

Dits cannot differentiate as “Git plus CDC.” It must prove value in explicit
media structure, edit and dependency graphs, rendition provenance, and
deterministic regeneration. Interoperability should be evaluated before inventing
an incompatible mechanism for any layer Xet already standardizes well.

### 2.4 Backup CAS systems such as restic

Restic’s format is instructive because it treats immutable writes as atomic,
groups many blobs into packs, authenticates/indexes stored content, and keeps
trees as deterministic lists of content references.

Adopt:

- immutable atomic storage,
- independently verifiable blobs inside packs,
- pack footer/index separation,
- format-version markers,
- repairable indexes, and
- reachability-based retention.

Dits differs because it also needs version-control refs, working trees, random
range hydration, semantic media objects, and collaborative conflict rules.

### 2.5 Bazel Remote Execution CAS

The Remote Execution API separates content-addressed storage from execution.
Its `FindMissingBlobs`, streaming upload/download, and newer
`SplitBlob`/`SpliceBlob` operations are especially relevant. `SplitBlob`
explicitly allows a server to describe a blob as content-defined chunks so a
client can fetch or upload only missing pieces.

Adopt:

- digest plus size as the transport identity,
- explicit “find missing” negotiation,
- bounded batch APIs for small objects,
- streaming APIs for large objects,
- server/client digest verification,
- split/splice operations independent of transport, and
- out-of-band agreement on chunking algorithm/version.

Dits should extend this model with commit/ref transactions, local repository
policy, media object kinds, packs, and provenance.

### 2.6 Perforce/Plastic-style binary workflows

Centralized creative VCS products demonstrate that exclusive checkout,
workspace views, partial materialization, and predictable large-binary
operations matter more to studios than a clever merge algorithm that cannot
safely merge the format.

Adopt:

- explicit binary lock policy,
- lock owner/lease/expiry semantics,
- sparse workspace rules,
- predictable file availability, and
- administrator-visible audit behavior.

Dits should retain local-first history and open verification instead of making a
central server the source of truth.

### 2.7 DVC, data versioning, and object-store versioning

Dataset tools show the usefulness of content-addressed caches, pipeline
lineage, remote object stores, and reproducible outputs. Object-store versioning
systems show branch/commit semantics over remote data without copying every
object.

Adopt:

- dependency and derivation graphs,
- reproducible command/environment records,
- cache reuse across branches,
- policy-driven remotes, and
- scalable metadata separate from immutable payloads.

Dits must keep media-specific fidelity and interactivity requirements that
dataset systems usually do not model.

### 2.8 OpenTimelineIO, OpenAssetIO, OpenUSD, OpenColorIO, and C2PA

These standards cover different layers and should not be collapsed into one
“media format.”

- **OpenTimelineIO** represents editorial timing, clips, tracks, transitions,
  and media references.
- **OpenAssetIO** defines host/asset-manager interactions for resolving,
  publishing, and managing references.
- **OpenUSD** models composed scene graphs, layers, references, and overrides.
- **OpenColorIO/ACES** define color-management concepts Dits should reference
  rather than reinterpret.
- **C2PA** defines signed claims, assertions, ingredients, and embedding
  mechanisms for media provenance.

Dits should interoperate:

- OTIO adapters for editorial graphs;
- OpenAssetIO integration for external asset resolution and publishing;
- USD-aware dependencies and layer identities;
- explicit color-space/transform metadata using established identifiers; and
- C2PA claims that can bind exported media to Dits commit/object identifiers.

None of these standards replaces the Dits CAS or commit graph. They provide
domain semantics around it.

## 3. Architectural principles

### 3.1 One trust core

The following behavior must have one canonical implementation:

- hashing and domain separation,
- chunking profiles and algorithm versions,
- object encoding and verification,
- manifest semantics,
- commit identity,
- ref transactions,
- reachability and garbage collection, and
- encryption envelopes.

The CLI, FUSE layer, server, web playground, SDK, and hosted service consume
that implementation or conform to the same test vectors.

### 3.2 Local verification before remote convenience

A user must be able to:

- create history offline,
- inspect every referenced object,
- verify a checkout,
- export an interoperable bundle,
- recover refs from verified objects, and
- migrate to another implementation.

A remote may accelerate discovery, transfer, locking, and compute. It must not
be the only place that knows what a commit means.

### 3.3 Exact identity and similarity are separate

An exact digest is a safe identity. A perceptual or structural score is an
index.

Similarity can propose:

- “these frames are candidates,”
- “this image likely derives from that source,” or
- “a residual may compress well.”

Similarity must never silently assert:

- byte equality,
- legal provenance,
- authorization,
- lossless reconstruction, or
- object substitution.

### 3.4 Formats are versioned contracts

Every persistent object and protocol message needs:

- a schema/version identifier,
- canonical encoding rules,
- domain-separated hashing,
- limits before allocation,
- unknown-field behavior,
- migration policy,
- test vectors, and
- fuzz/property tests.

Rust `bincode` is convenient for internal experiments but is not a stable
cross-language public format. Pretty JSON is inspectable but inefficient and
requires canonicalization before it can safely define identity.

A practical path is:

1. retain existing formats under an explicit repository format version;
2. define v2 envelopes in deterministic CBOR or a tightly specified protobuf
   profile;
3. hash a domain tag plus canonical bytes;
4. provide JSON diagnostic rendering that is not itself the object identity;
5. ship conformance vectors before enabling writes by default.

## 4. Target layered architecture

```text
Layer 6  Hosted coordination and compute (optional)
         auth, policy, locks, review, render/build workers

Layer 5  Verified transport and availability
         find-missing, stream, split/splice, packs, resume, ref transactions

Layer 4  Semantic creative graph
         timelines, edits, scene layers, dependency graph, derivations

Layer 3  Media structure and renditions
         MP4 boxes/samples, frames/audio blocks, proxies, thumbnails, metadata

Layer 2  Repository graph
         file manifests, trees, commits, refs, signatures

Layer 1  Immutable storage
         chunks, blobs, packs, indexes, encryption envelopes

Layer 0  Verification primitives
         canonical encoding, BLAKE3, domain separation, limits, test vectors
```

Dependencies point downward. A lower layer never imports a hosted-service
concept.

## 5. Proposed object model v2

### 5.1 Object envelope

Conceptual form:

```text
ObjectEnvelope {
  format_version
  object_kind
  encoding
  feature_flags
  payload_length
  payload
}
object_id = BLAKE3("dits-object-v2" || canonical_envelope)
```

The real specification must define byte order, maximum sizes, canonical map
ordering, duplicate-key behavior, and unknown features.

### 5.2 Core object kinds

#### Chunk

An exact byte range. A chunk carries no path or repository identity.

#### Blob

An exact opaque object used for small metadata payloads, encoded frames, audio
blocks, thumbnails, or format-specific pieces.

#### FileManifest

Contains:

- logical size,
- exact full-content digest,
- ordered extents,
- storage strategy,
- mode/type,
- optional sparse ranges,
- optional structure object,
- optional external/promisor availability, and
- required decoder/feature identifiers.

An extent can reference a chunk, zero range, inline bytes below a limit, or a
future packed range.

#### Tree

Deterministic sorted mapping of path component to file/tree object. A tree
avoids rewriting one giant repository manifest for every local change and
supports subtree traversal.

#### Commit

Contains:

- root tree ID,
- zero or more parent commit IDs,
- author/committer identities,
- timestamp with explicit offset,
- message,
- optional project graph IDs,
- optional provenance/signature IDs, and
- repository-format capabilities required to read it.

#### Ref transaction

Refs are mutable names and therefore are not normal content-addressed objects.
An update must state:

- ref name,
- expected old value,
- proposed new value,
- actor/policy context, and
- optional signature/lease.

Apply with compare-and-swap. Divergence is a result, never an overwrite mode
hidden inside “sync.”

#### Pack and pack index

A pack contains many immutable records. The index maps object ID to pack ID,
offset, encoded length, decoded length, kind, compression/encryption mode, and
checksum.

Packs should support:

- independently verified records,
- bounded delta chains,
- sequential creation,
- index rebuild from pack data,
- atomic publication, and
- multi-pack lookup without repacking on every append.

### 5.3 Domain objects

#### MediaStructure

A typed, versioned description of relevant container structure. It references
exact blobs/ranges and retains enough information to reconstruct the declared
contract.

#### FrameSequence / AudioSequence

An ordered sequence of time-addressed samples. Each entry can include:

- presentation/decode timestamp,
- duration,
- exact decoded-sample digest under a named canonical decode contract,
- encoded rendition ID,
- source relationship, and
- optional similarity index keys.

#### Timeline

An interchange-oriented editorial graph: tracks, clips, source ranges,
transitions, effects metadata, and references. It should map to/from OTIO where
semantics align.

#### EditGraph

A non-destructive derivation graph whose operations are individually versioned.
Examples: trim, reorder, crop, affine transform, color transform reference,
composite, audio gain, and text overlay.

The graph records intent; rendered frames remain separate derived objects.

#### Rendition

Binds an output object to:

- source graph/commit,
- render recipe,
- tool and version,
- environment/container digest,
- color-management configuration,
- fidelity tier, and
- verification results.

#### ProvenanceClaim

References external or embedded C2PA data and binds it to Dits object/commit
IDs. Dits metadata is not automatically a cryptographic provenance claim.

## 6. FACR: a disciplined design

FACR should be reframed as a media identity and derivation layer, not “Dits’
new codec.”

### 6.1 Preserve the original

The imported master remains an exact byte object. No decode/re-encode path can
replace archival identity unless the user explicitly chooses a lossy policy.

### 6.2 Define canonical decode contracts

A decoded frame digest is meaningful only when the contract specifies:

- decoder/version or normative decode semantics,
- pixel layout and bit depth,
- chroma upsampling behavior,
- color primaries, transfer, matrix, and range,
- orientation and clean aperture,
- alpha semantics,
- frame timing, and
- deterministic normalization rules.

Without this, two correct tools can hash different pixel buffers for the same
asset.

### 6.3 Store encoded renditions separately

Frame identity and storage encoding should be separable:

```text
DecodedFrameIdentity -> one or more EncodedFrameRenditions
```

A lossless PNG/WebP/JXL or mezzanine object is a rendition. Its byte digest is
still verified, but it is not the universal semantic identity.

### 6.4 Use perceptual indexing only for candidate search

For a flattened external re-export:

1. derive bounded perceptual features;
2. search prior frames/tiles for candidates;
3. verify timing/context constraints;
4. estimate whether exact residual coding is beneficial;
5. store a residual only when reconstruction is exact for the declared target;
6. retain the exported exact bytes as the authoritative rendition.

False matches affect compression opportunity, never correctness.

### 6.5 Capture edit decisions whenever possible

The economic breakthrough comes from preserving edit intent:

- import OTIO/FCPXML/AAF/EDL where possible;
- version source references and operations;
- render on demand;
- reuse unchanged sources and intermediate results;
- compare graph changes separately from rendered-pixel changes.

Trying to reverse-engineer every flattened export is a fallback, not the
primary architecture.

## 7. Storage-engine evolution

### 7.1 Immediate: safe loose objects

Required invariants:

- write beside destination;
- close/sync before atomic publication;
- never expose a partial new object;
- verify on read;
- quarantine a checksum failure;
- do not trust path existence as proof of validity during repair;
- make concurrent identical writes harmless.

### 7.2 Bounded-memory ingest

Target memory should be approximately:

```text
O(chunk_max * worker_count + bounded metadata)
```

not:

```text
O(file_size + sum(chunk_copies))
```

Pipeline:

1. open file and capture stable metadata;
2. stream or mmap bounded ranges;
3. update full-file BLAKE3 incrementally;
4. identify chunk boundaries;
5. hash/store chunks through a bounded queue;
6. write provisional manifest/index state to a transaction directory;
7. re-check file identity/metadata if mutation detection is required;
8. atomically publish the index entry;
9. clean transaction state after success or recovery.

For MP4, parse headers incrementally and stream `mdat` ranges rather than
materializing the full payload again.

### 7.3 Packs

Introduce packs only after object format versioning and repair rules exist.

Suggested policy:

- keep new/small working-set objects loose;
- background-pack cold loose objects after a count/size threshold;
- group by access/fidelity class, not only hash order;
- avoid long deltas for random media hydration;
- maintain a multi-pack index;
- support repack without changing object IDs;
- publish new index then retire old packs after reachability/snapshot safety.

### 7.4 Trees instead of one monolithic manifest

A sorted tree hierarchy reduces write amplification for large repositories and
allows sparse traversal. Migration can preserve the existing manifest as v1
while v2 commits point to trees.

## 8. Remote protocol

### 8.1 Semantics before transport

Define these protocol operations:

- `GetCapabilities`
- `ListRefs`
- `FindMissingObjects`
- `ReadObject`
- `WriteObject`
- `SplitBlob`
- `SpliceBlob`
- `ReadPack`
- `WritePack`
- `UpdateRefs`
- `AcquireLock`, `RenewLock`, `ReleaseLock`
- `GetAvailability`

Each request declares format versions, digest algorithms, compression,
encryption mode, and limits.

### 8.2 Transfer rules

- Small objects may be batched under a strict request limit.
- Large objects use a streaming resource name containing digest and size.
- Partial data is never published under the final object ID.
- Resume points are verified object, pack-record, or chunk boundaries.
- A receiver recomputes the digest and validates declared length.
- Missing-object negotiation is advisory until final verification.
- A server can return a split plan; a client may reject unsupported chunking
  algorithms.
- Ref updates occur only after all required objects are durable and use
  compare-and-swap.

### 8.3 HTTP and QUIC

Provide protocol semantics over ordinary HTTP first or in parallel with QUIC.
QUIC can improve concurrent stream behavior, connection migration, and loss
isolation, but it does not define repository consistency.

A P2P mode also needs:

- peer identity,
- authorization,
- repository capability,
- NAT/rendezvous policy,
- replay protection,
- abuse/rate limits,
- object verification, and
- a clear distinction between discovery and trust.

### 8.4 Offline bundles

A portable bundle/pack format is strategically important. It enables:

- air-gapped exchange,
- studio handoff,
- archival export,
- remote seeding,
- conformance fixtures, and
- recovery without a hosted service.

## 9. Security model

### 9.1 Threat classes

Document separately:

- corrupted or malicious storage,
- malicious repository content,
- untrusted remote peer,
- compromised collaborator credentials,
- object-ID equality leakage,
- filename/path leakage,
- media parser vulnerabilities,
- decompression bombs,
- resource exhaustion,
- rollback/ref-rewrite attacks, and
- provenance forgery.

### 9.2 Encryption modes

#### Plain CAS

Best reuse and interoperability. Protect with filesystem/object-store access
control and transport encryption.

#### Repository-key envelope encryption

Encrypt objects with a repository key and randomized nonces. Object IDs can be
computed over plaintext and mapped through encrypted metadata, or over
ciphertext with a different trade-off. Cross-repository deduplication is not a
goal.

#### Message-locked encryption

Derive encryption from content to preserve equality-based deduplication. This
reveals equality and permits confirmation/guessing attacks for predictable
content. It must be an explicit policy with warnings and should eventually use
a server-aided construction such as an OPRF when the threat model requires it.

Do not claim convergent encryption provides the same confidentiality as
randomized encryption.

### 9.3 Parsing and canonicalization

Media and archive parsers operate on attacker-controlled bytes. Require:

- length and nesting limits,
- checked arithmetic,
- no allocation from an unbounded declared size,
- fuzzing,
- corpus regression,
- timeout/cancellation points,
- sandboxing for external tools where practical, and
- no execution of embedded scripts/macros during metadata inspection.

### 9.4 Provenance

Dits history records repository actions. C2PA records signed assertions and
ingredient relationships. Integrate the two without conflating them:

- a Dits commit may reference a C2PA claim;
- an exported asset may embed a C2PA manifest that references a Dits commit ID;
- verification reports signature status and object availability independently;
- unsigned repository metadata remains useful but is not presented as a signed
  authenticity guarantee.

## 10. Performance program

### 10.1 Required metrics

Every benchmark record includes:

- commit SHA and dirty status,
- OS/kernel/filesystem,
- CPU, memory, storage, and network,
- build profile and feature set,
- corpus generator/license and exact inputs,
- mutation recipe,
- cold/warm cache state,
- encryption/compression mode,
- command line and raw output.

Measure:

- ingest throughput and p50/p95/p99 chunk-store latency,
- peak RSS,
- logical/read/written bytes,
- reuse and write amplification,
- object/pack/index counts,
- checkout and random-range latency,
- status/log/GC time versus repository scale,
- remote round trips and transferred bytes,
- crash recovery and repair time.

### 10.2 Corpus classes

- random/incompressible bytes;
- zero/repeated patterns;
- source-code trees;
- archives and game builds;
- camera MP4/MOV;
- fragmented MP4;
- mezzanine ProRes/DNxHR;
- H.264/H.265/AV1 long-GOP;
- RAW/JPEG/PNG/TIFF/PSD-like images;
- audio stems;
- 3D scenes and texture trees;
- generated mutation families: append, insert, reorder, metadata-only, stream
  copy, re-encode, grade, resize, archive reorder, encryption.

### 10.3 Regression gates

Do not gate on one universal MB/s number. Gate on envelopes:

- peak memory stays below a function of configured concurrency and chunk max;
- byte-exact checkout always passes;
- no corruption survives verification;
- representative mutation reuse does not regress beyond a declared tolerance;
- object lookup remains sublinear through the supported scale;
- pack/index repair succeeds from injected truncation;
- remote resume transfers only unverified ranges;
- command docs match the binary.

## 11. Documentation and conformance as product features

To become a systems standard, Dits needs more than code.

### Normative specifications

Define:

- object encoding,
- hash domains,
- repository format versions,
- pack/index format,
- ref transactions,
- bundle format,
- remote protocol,
- lock semantics,
- media canonicalization contracts,
- encryption modes, and
- error behavior.

Use RFC-style `MUST`, `SHOULD`, and `MAY` only in normative documents.

### Test vectors

Publish small, reviewable vectors for:

- chunk boundaries,
- object IDs,
- manifests/trees/commits,
- packs/indexes,
- malformed inputs,
- encryption envelopes,
- split/splice results,
- ref transaction conflicts, and
- media decode identity profiles.

### Reference and independent implementations

The Rust engine is the reference implementation. A standard becomes credible
when a second implementation can read, verify, and produce the same vectors
without copying Rust internals.

### Golden media corpus

Store tiny redistributable fixtures or deterministic generators. Large or
licensed samples can be fetched by manifest with checksums.

For every supported format variant, state:

- fixture,
- parser path,
- expected structure,
- reconstruction contract,
- exact/fidelity assertion,
- metadata preservation policy, and
- known unsupported cases.

### Architecture decision records

Every major decision records context, decision, alternatives, compatibility
impact, security impact, migration, and acceptance tests.

## 12. Recommended execution sequence

### Milestone 0 — credibility and safety

- Keep one canonical product boundary.
- Finish truth-labeling docs and remove fabricated operational claims.
- Make loose-object writes atomic.
- Fix current-format-first deserialization.
- Repair telemetry config/privacy behavior or remove telemetry.
- Add golden MP4/MOV fixtures and destructive failure tests.
- Refuse unsafe sync/ref overwrite behavior.

**Exit gate:** a user can trust local add/commit/checkout and understand exactly
what is experimental.

### Milestone 1 — engine 1.0

- Make binary consume the library rather than recompiling modules.
- Define repository format v1 compatibility policy.
- Add fsck/repair/quarantine commands.
- Add transaction journals for ingest/ref updates.
- Formalize storage strategies and classifier overrides.
- Publish local conformance vectors.

**Exit gate:** local repositories have a documented compatibility and recovery
contract.

### Milestone 2 — scale

- Implement bounded-memory ingest.
- Stream MP4 payload ranges.
- Introduce tree objects.
- Add packs, indexes, and multi-pack lookup.
- Add scale benchmarks and crash-injection tests.
- Improve GC from repeated filesystem walks to indexed reachability.

**Exit gate:** multi-terabyte assets and high object counts do not require
file-sized memory or pathological metadata operations.

### Milestone 3 — semantic media

- Specify canonical decoded-frame/audio profiles.
- Preserve original masters.
- Import/export OTIO-style editorial graphs.
- Separate frame identity, encoded rendition, and perceptual index.
- Implement visual/structural diff with explicit confidence.
- Capture deterministic render recipes and color metadata.
- Add C2PA binding experiments.

**Exit gate:** Dits can explain a media change, not merely report different
bytes.

### Milestone 4 — remote CAS

- Publish protocol and bundle specifications.
- Implement HTTP find-missing/read/write/ref transactions.
- Add split/splice and resumable transfer.
- Add remote locks with leases.
- Add optional QUIC/P2P transport using the same semantics.
- Run interoperability and hostile-network tests.

**Exit gate:** two independent stores can exchange and verify a repository
without hidden server state.

### Milestone 5 — ecosystem and standardization

- Open conformance suite and public corpus.
- OpenTimelineIO/OpenAssetIO/OpenUSD adapters.
- Independent reader implementation.
- SDK generation from stable protocol schemas.
- Hosted service built only from canonical engine/protocol.
- Systems course and certification fixtures.

**Exit gate:** Dits is implementable, teachable, migratable, and independently
verifiable.

## 13. Explicit non-goals

Until the lower gates are complete, Dits should not prioritize:

- a second incompatible backend engine;
- broad language SDKs over unstable formats;
- Kubernetes diagrams without a deployable service;
- global cross-customer deduplication;
- automatic merge of opaque binary formats;
- a proprietary editor or codec as the only path to value;
- petabyte claims without object-count and recovery evidence;
- perceptual similarity as object identity; or
- hiding divergence behind a one-word `sync` command.

## 14. Research sources

Primary specifications and project documents used in this review:

- FastCDC paper: <https://www.usenix.org/system/files/conference/atc16/atc16-paper-xia.pdf>
- Git pack format: <https://git-scm.com/docs/gitformat-pack>
- Git multi-pack index: <https://git-scm.com/docs/multi-pack-index>
- Git partial clone design: <https://git-scm.com/docs/partial-clone>
- Git LFS specification: <https://github.com/git-lfs/git-lfs/blob/main/docs/spec.md>
- Hugging Face Xet documentation: <https://huggingface.co/docs/xet/>
- Xet core implementation: <https://github.com/huggingface/xet-core>
- Bazel Remote Execution API:
  <https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto>
- restic repository format:
  <https://github.com/restic/restic/blob/master/doc/design.rst>
- QUIC transport specification: <https://www.rfc-editor.org/rfc/rfc9000>
- CBOR and deterministic encoding considerations:
  <https://www.rfc-editor.org/rfc/rfc8949>
- OpenTimelineIO: <https://opentimelineio.readthedocs.io/en/latest/>
- OpenAssetIO: <https://openassetio.github.io/OpenAssetIO/>
- OpenUSD: <https://openusd.org/release/intro.html>
- OpenColorIO: <https://opencolorio.org/>
- C2PA specification:
  <https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html>
- DupLESS/message-locked encryption:
  <https://www.usenix.org/system/files/conference/usenixsecurity13/sec13-paper_bellare.pdf>
- IPLD data model and Merkle-DAG concepts: <https://ipld.io/docs/>

These sources guide architecture. They do not imply protocol compatibility
until Dits publishes and passes explicit conformance tests.
