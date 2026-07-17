# Dits Systems Course Standard

**Maturity:** Design  
**Purpose:** Turn Dits into an executable, open course in storage systems,
version control, distributed protocols, media computing, and trustworthy
software engineering.

“Course standard” should mean more than extensive documentation. A learner
should be able to read a small normative concept, run a deterministic lab,
inspect the bytes, inject failures, compare another implementation, and pass a
conformance test.

## 1. Learning outcomes

A student who completes the course should be able to:

1. explain and implement content addressing and Merkle-style graphs;
2. compare fixed, rolling, and content-defined chunking;
3. design immutable object storage with atomic publication and verification;
4. build manifests, trees, commits, refs, branches, and reachability-based GC;
5. distinguish exact identity, structural equivalence, and perceptual
   similarity;
6. parse a bounded subset of a media container safely;
7. design sparse checkout and on-demand hydration;
8. specify a resumable remote CAS protocol with divergence-safe ref updates;
9. reason about confidentiality, equality leakage, provenance, and parser
   threats;
10. create reproducible performance experiments and reject misleading claims;
11. evolve an on-disk format without silently breaking old readers; and
12. implement an independent reader that passes public Dits vectors.

## 2. Course artifacts

Every module includes:

- a normative reading;
- a small reference implementation path;
- one deterministic fixture;
- one failure-injection fixture;
- a lab command;
- expected machine-readable output;
- a rubric;
- an extension challenge;
- a conformance test.

Fixtures should be generated where possible. Downloaded media requires a
license record and checksum.

## 3. Suggested 12-module sequence

### Module 1 — Bytes, hashes, and identity

Topics:

- cryptographic digest properties;
- domain separation;
- content ID versus location;
- digest plus size;
- collision handling policy;
- canonical encoding.

Lab:

- hash provided blobs;
- mutate one bit;
- verify IDs;
- demonstrate why JSON formatting cannot define identity without
  canonicalization.

Deliverable:

- a tiny object verifier compatible with published vectors.

### Module 2 — Content-defined chunking

Topics:

- fixed-size shift problem;
- rolling/gear hash intuition;
- FastCDC minimum/average/maximum;
- boundary determinism;
- adversarial and degenerate inputs;
- metadata versus reuse trade-off.

Lab:

- chunk deterministic byte streams;
- apply append, insertion, deletion, and random rewrite mutations;
- report boundary stability and reuse.

Deliverable:

- chunk-boundary output matching Dits vectors.

### Module 3 — Immutable local CAS

Topics:

- fan-out paths;
- temporary files and atomic no-replace publication;
- concurrent writers;
- checksum verification;
- corrupt-object quarantine;
- loose-object scaling.

Lab:

- kill a writer between stages;
- race two identical writers;
- corrupt a stored object;
- verify that no partial destination is trusted.

Deliverable:

- crash-safe loose object store.

### Module 4 — Manifests, trees, commits, and refs

Topics:

- ordered extents;
- file hashes versus chunk hashes;
- hierarchical trees;
- commit parents;
- mutable refs;
- compare-and-swap;
- detached HEAD and tags.

Lab:

- construct a commit graph from raw objects;
- move a ref conditionally;
- reject a stale expected-old value.

Deliverable:

- repository inspector that does not invoke the main CLI.

### Module 5 — Working index and transactions

Topics:

- working tree versus index versus commit;
- source mutation during ingest;
- transaction journals;
- atomic index replacement;
- recovery after interruption;
- deterministic status.

Lab:

- interrupt add;
- modify source during ingest;
- recover or abort;
- prove that published metadata references only present objects.

Deliverable:

- transaction/recovery report.

### Module 6 — Reachability, garbage collection, and packs

Topics:

- mark/sweep roots;
- stashes, pins, transactions, promised objects;
- pack records and indexes;
- multi-pack lookup;
- compaction and retirement;
- repairable caches.

Lab:

- pack a fixture repository;
- rebuild the index;
- inject pack truncation;
- run GC without deleting protected objects.

Deliverable:

- fsck and reachability proof.

### Module 7 — Hybrid text/binary workflows

Topics:

- line diff and merge;
- opaque binary policy;
- storage classification;
- explicit overrides;
- file locks and leases;
- conflict presentation.

Lab:

- version text metadata and binary payload together;
- merge text changes;
- produce an explicit binary conflict;
- demonstrate lock expiry.

Deliverable:

- mixed-project change report.

### Module 8 — Media structure

Topics:

- MP4/ISOBMFF boxes;
- sizes, offsets, sample tables;
- `stco`/`co64`;
- unknown-box preservation;
- parser limits;
- byte-exact versus structural/fidelity round trip.

Lab:

- inspect generated MP4 fixtures;
- separate structure and payload ranges;
- reconstruct;
- reject a malformed oversized box.

Deliverable:

- support-matrix record with exact assertions.

### Module 9 — Semantic media graphs

Topics:

- encoded versus decoded identity;
- timing and frame/sample sequences;
- non-destructive edits;
- OpenTimelineIO concepts;
- renditions and recipes;
- perceptual features as indexes, not IDs.

Lab:

- represent a trim/reorder without copying source frames;
- compare graph diff to flattened byte diff;
- attempt a perceptual match and require exact verification before reuse.

Deliverable:

- visual/structural diff report with confidence labels.

### Module 10 — Security and provenance

Topics:

- plaintext CAS;
- repository-key encryption;
- convergent/message-locked encryption;
- equality and dictionary attacks;
- parser sandboxing;
- signatures;
- C2PA ingredient relationships;
- audit metadata versus authenticity.

Lab:

- compare equality leakage under encryption modes;
- tamper with an object and a provenance claim independently;
- report distinct failure classes.

Deliverable:

- repository threat model.

### Module 11 — Remote CAS and partial hydration

Topics:

- capabilities;
- find-missing;
- batch versus streaming;
- split/splice;
- resume;
- Bloom-filter false positives;
- HTTP and QUIC;
- ref transaction after object durability;
- peer discovery versus trust.

Lab:

- exchange only missing objects;
- interrupt/resume;
- corrupt one range;
- create branch divergence;
- verify no silent overwrite.

Deliverable:

- wire trace and protocol conformance output.

### Module 12 — Performance and compatibility

Topics:

- benchmark question design;
- cold/warm cache;
- peak RSS;
- write amplification;
- corpus and mutation recipes;
- format versioning;
- previous-reader/new-reader matrix;
- independent implementation.

Lab:

- benchmark two equivalent contracts;
- identify an invalid comparison;
- read old vectors with the new implementation;
- run an independent verifier.

Deliverable:

- capstone compatibility and performance report.

## 4. Conformance levels

### Level 0 — Object verifier

Can parse object envelopes, compute IDs, enforce limits, and verify public
vectors.

### Level 1 — Local repository reader

Can read packs/loose objects, trees, commits, refs, and reconstruct exact files.

### Level 2 — Local writer

Can create canonical objects, transactions, commits, and atomic refs that the
reference reader accepts.

### Level 3 — Transport implementation

Can find, stream, resume, verify, and update refs using the public protocol.

### Level 4 — Media semantic implementation

Can read declared media/timeline objects and reproduce named exact or fidelity
contracts.

A hosted service is not conformant merely because it accepts CLI uploads. It
must pass the object and protocol suites.

## 5. Assessment rubric

| Dimension | Weight | Evidence |
|---|---:|---|
| Correctness and exact reconstruction | 25% | test vectors, hashes, failure behavior |
| Data safety and recovery | 20% | crash/concurrency/repair tests |
| Specification fidelity | 15% | canonical bytes and compatibility matrix |
| Security reasoning | 10% | threat model and mitigations |
| Performance methodology | 10% | reproducible raw results |
| Media/semantic clarity | 10% | identity versus similarity handling |
| Interoperability | 10% | independent implementation or adapter |

Performance cannot compensate for a failed integrity or recovery test.

## 6. Repository organization for the course

Recommended structure:

```text
spec/
  object-format/
  repository-format/
  pack-format/
  remote-protocol/
  media-profiles/
  security/

conformance/
  vectors/
  malformed/
  runners/
  reports/

fixtures/
  generated/
  media/
  licenses/
  manifests/

labs/
  01-hashing/
  ...
  12-capstone/

docs/education/
  course-standard.md
  instructor-guide.md
  learner-guide.md
```

The current repository does not yet contain this full structure. Add it
incrementally when each format has an accepted normative specification.

## 7. Reproducible lab rules

- Pin compiler/tool versions or record them.
- Generate inputs deterministically.
- Hash every fixture.
- Keep expected outputs machine-readable.
- Separate required results from hardware-dependent timing.
- Never require access to a hosted Dits service for core labs.
- Make destructive labs run only in temporary repositories.
- Include Windows, macOS, and Linux notes where filesystem semantics differ.
- Provide an offline bundle of readings, vectors, and fixtures.
- Version the course against a Dits repository-format release.

## 8. Instructor release gate

A course release is ready when:

- all required labs run from a clean checkout;
- no lab depends on undocumented CLI output;
- every current capability has code evidence;
- experimental labs say what may change;
- measured claims include raw results;
- malformed fixtures cannot escape their temporary environment;
- at least one non-reference reader passes Level 1 vectors; and
- learners can complete Modules 1–6 without network access.

## 9. Why this matters to Dits

The course forces the project to produce the assets required for a durable
standard:

- stable vocabulary;
- small normative formats;
- executable examples;
- hostile fixtures;
- migration discipline;
- independent verification;
- honest performance data; and
- contributors who understand the whole system rather than one feature.

A system becomes infrastructure when people can learn it, reimplement it,
inspect it, and recover it without asking its original author.
