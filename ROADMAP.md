# Dits Roadmap

**Maturity:** Execution plan. This document describes unfinished work.

[docs/STATUS.md](docs/STATUS.md) is the authority for shipped behavior. This
roadmap orders work by safety, compatibility, and proof. A later milestone does
not become Current because an experiment or design document exists.

## Decision framework

Dits accepts a feature into the Current product only when it has:

- a clearly owned layer in the active architecture;
- a versioned persistence or protocol contract when it creates durable bytes;
- resource and parser limits before allocation;
- corruption, interruption, and recovery behavior;
- conformance, failure, and compatibility tests;
- reproducible measurements for performance claims; and
- user documentation generated from or checked against the implementation.

## Milestone 0 — credibility and data safety

**Outcome:** local add, commit, checkout, and inspection are safe enough to form
the foundation of every later feature.

- [x] Stream large-file ingest with bounded memory and backpressure
  ([#34](https://github.com/byronwade/dits/issues/34)) — streaming FastCDC for
  large binaries; text/MP4 specialized paths still buffer whole files.
- [x] Publish index state only after every referenced object is durable and
  verified — index writes use temp + rename; object publication was already
  atomic.
- [x] Detect source mutation during ingest or fail with a stable error.
- [ ] Add crash, disk-full, concurrent-writer, corrupt-object, and retry tests.
- [ ] Build a generated/licensed golden MP4/MOV corpus with explicit fidelity
  contracts ([#36](https://github.com/byronwade/dits/issues/36)).
- [ ] Generate the public media support matrix from conformance results.
- [ ] Remove or clearly classify remaining speculative public claims.

**Exit gate:** ingest peak memory follows a documented bound; interrupted writes
cannot publish incomplete repository state; supported fixtures reproduce their
declared exact or fidelity contract.

## Milestone 1 — repository format 1.0

**Outcome:** another implementation can verify a Dits repository without copying
Rust implementation details.

- [ ] Define repository format markers and required/optional feature bits.
- [ ] Define domain-separated object IDs and canonical object envelopes.
- [ ] Version chunking profiles, manifests, trees, commits, refs, indexes,
  encryption envelopes, and bundles.
- [ ] Specify unknown-version, read-only fallback, migration, and deprecation
  behavior.
- [ ] Publish exact positive and malformed conformance vectors
  ([#35](https://github.com/byronwade/dits/issues/35)).
- [ ] Ship a small independent Level 0 verifier.
- [x] Make the CLI binary consume the canonical library module graph
  ([#37](https://github.com/byronwade/dits/issues/37)).

**Exit gate:** reference writers are deterministic; current readers reject
ambiguous or unsupported bytes safely; legacy compatibility is explicit.

## Milestone 2 — repository scale

**Outcome:** capacity is limited primarily by storage, not RAM, inode count, or
repeated full-directory scans.

- [ ] Add deterministic tree objects for sparse traversal and lower write
  amplification.
- [ ] Introduce immutable versioned packs with independently verifiable records.
- [ ] Add rebuildable pack indexes and multi-pack lookup
  ([#38](https://github.com/byronwade/dits/issues/38)).
- [ ] Replace repeated reachability walks with indexed mark/sweep inputs.
- [ ] Coordinate readers, transactions, promised objects, pins, GC, and repack.
- [ ] Benchmark one million small objects plus large random-range media access.
- [ ] Report cold/warm cache state, filesystem, hardware, peak RSS, and raw I/O.

**Exit gate:** a million-object scale fixture works without a million loose files;
repack changes no logical object ID; corrupted indexes can be rebuilt.

## Milestone 3 — semantic media proof

**Outcome:** Dits can explain and reproduce a media change, not merely report
that exported bytes differ.

- [ ] Preserve every imported master as an exact object.
- [ ] Define canonical decoded-frame and audio identity profiles.
- [ ] Separate exact identity, structural equivalence, fidelity equivalence, and
  perceptual candidate matching.
- [ ] Model timelines and non-destructive edit graphs with OTIO-compatible
  import/export where semantics align.
- [ ] Model renditions with source graph, tool/version, render recipe,
  environment, color configuration, fidelity contract, and verification.
- [ ] Prototype optional C2PA bindings without treating repository metadata as a
  signed authenticity claim
  ([#40](https://github.com/byronwade/dits/issues/40)).
- [ ] Measure FACR storage, decode cost, seek latency, and cross-tool identity on
  realistic media rather than synthetic frames alone.

**Exit gate:** an independently verified trim/reorder example preserves the
master, stores no duplicate unchanged samples, round-trips supported OTIO
semantics, and produces a separately addressed reproducible rendition.

## Milestone 4 — verified remote CAS

**Outcome:** two stores can exchange and verify a repository without hidden
server state.

- [ ] Specify transport-independent capabilities, object negotiation, streaming,
  packs, resume, availability, locks, and ref transactions
  ([#39](https://github.com/byronwade/dits/issues/39)).
- [ ] Implement an HTTP reference transport first.
- [ ] Verify digest and declared size before admitting every received object.
- [ ] Publish refs only after required objects are durable.
- [ ] Use compare-and-swap ref updates and return divergence explicitly.
- [ ] Add remote lock acquire/renew/release with lease semantics.
- [ ] Add offline bundles using the same object verification rules.
- [ ] Run hostile-network tests for interruption, replay, corruption, timeout,
  stale refs, and concurrent updates.
- [ ] Add optional QUIC and P2P transports only after they pass the same suite.

**Exit gate:** clone/fetch/push/pull over HTTP reproduce exact checkout hashes;
resume never trusts partial unverified data; a stale ref cannot be overwritten.

## Milestone 5 — usable team product

**Outcome:** a small asset-heavy team can adopt Dits without becoming storage or
version-control experts.

- [ ] Import Git LFS history and working repositories with a reversible plan.
- [ ] Provide sparse workspace and availability policies.
- [ ] Integrate binary locks and repository status inside one initial creative
  toolchain, beginning with Unreal/Unity and a common DCC workflow.
- [ ] Provide a desktop status/transfer client only after CLI semantics stabilize.
- [ ] Add human review links as a layer over immutable commits and renditions.
- [ ] Support local storage, bring-your-own object storage, and managed remote
  storage through the same public protocol.
- [ ] Validate onboarding, recovery, and migration with design partners.

**Exit gate:** a 5–50 person design-partner team can migrate, collaborate,
recover, and leave without proprietary repository state.

## Milestone 6 — ecosystem and standardization

**Outcome:** Dits is implementable, teachable, and interoperable.

- [ ] Publish stable protocol schemas and generate SDKs only from them.
- [ ] Add OpenTimelineIO, OpenAssetIO, OpenUSD, and color-management adapters.
- [ ] Maintain public corpus, conformance reports, and independent readers.
- [ ] Complete the systems course with labs tied to normative vectors.
- [ ] Build any hosted control plane from the canonical engine and protocol.
- [ ] Pursue standards collaboration only after independent interoperability is
  demonstrated.

## Explicit non-priorities

Until the earlier exit gates are met, do not prioritize:

- another canonical backend or object model;
- broad SDKs over unstable formats;
- Kubernetes or multi-region architecture without a deployable service;
- global cross-customer deduplication;
- automatic merge of opaque binary formats;
- a proprietary codec or editor as the only path to value;
- petabyte claims without recovery and object-count evidence;
- perceptual similarity as exact identity; or
- a one-word `sync` command that hides branch divergence.

## Progress reporting

Milestone status is derived from accepted issues, conformance results, and the
root workspace—not from phase names in marketing copy. Update, in order:

1. implementation and tests;
2. [docs/STATUS.md](docs/STATUS.md);
3. this roadmap;
4. the website status surfaces.
