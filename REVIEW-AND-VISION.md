# Dits Product Direction

**Maturity:** Strategic direction. Not a shipped-capability document.

## Conclusion

Dits has strong potential, but not because content-defined chunking is novel.
The durable opportunity is to create an open, local-first and independently
verifiable history of large media and asset pipelines.

The product should become:

> **Exact source history plus a reproducible graph of edits, dependencies, and
> renditions—shared through an open protocol.**

That is closer to Git plus a media build graph than Git LFS with a different
uploader.

## The problem

Asset-heavy teams still combine several incomplete systems:

- source code in Git;
- large binaries in Git LFS, Perforce, shared storage, or copied folders;
- project intent inside proprietary editor files;
- review history in a collaboration service;
- render and build provenance in naming conventions, chat, or memory;
- remote access through full sync, edge infrastructure, or cloud streaming.

Each product solves part of the workflow, but the portable history of how exact
sources became a specific result remains weak.

## The market reality

The storage primitive is validated and competitive:

- Git LFS separates pointer history from large payload storage.
- Hugging Face Xet publishes a content-defined chunking and CAS protocol with a
  Rust implementation and Git LFS compatibility.
- Perforce provides mature binary locking, delta transfer, global infrastructure,
  administration, and creative-tool integrations.
- Unity Version Control combines distributed/centralized workflows and smart
  locks.
- LucidLink provides on-demand cloud file streaming.
- Frame.io provides media review, approval, version stacks, and sharing.
- DVC and related data tools provide lineage, caches, and reproducible pipelines.

Dits should interoperate with these categories where possible. Reimplementing
every surrounding product would destroy focus.

## The differentiated product model

### 1. Exact trust core

- Preserve imported bytes exactly.
- Address immutable objects cryptographically.
- Verify length and digest across every trust boundary.
- Publish manifests and refs only after object durability.
- Make repository meaning independent of a hosted database.

### 2. Structure-aware media

- Parse only explicitly supported formats and layouts.
- Preserve unknown or unsupported input opaquely.
- Separate container structure, decoded identity, and encoded rendition.
- State exact, structural, and fidelity contracts precisely.

### 3. Semantic creative graph

- Record timelines, edits, dependencies, render recipes, and provenance.
- Reuse established identifiers and interchange standards.
- Treat similarity as a search index, never as exact identity.
- Keep originals and exports addressable even when a relationship is inferred.

### 4. Verified collaboration

- Negotiate and move only missing objects.
- Resume from verified boundaries.
- Update refs with compare-and-swap.
- Model lock leases and content availability explicitly.
- Run the same semantics over local paths, HTTP, bundles, QUIC, or P2P.

## Initial adoption wedge

Start with small and mid-sized game and virtual-production teams that already
use Git-oriented workflows but struggle with Unreal/Unity assets, DCC files,
video, builds, locks, and remote contractors.

Why this wedge:

- developers already understand commits and branches;
- large binary assets and exclusive-edit workflows are unavoidable;
- Git LFS pain is visible and measurable;
- build and asset dependency graphs create a path to semantic value;
- teams can evaluate an open tool before enterprise procurement;
- the same foundation later extends into post-production and VFX.

The first design-partner workflow should be narrow: migrate an existing project,
lock a binary asset, create local history, transfer a verified delta, hydrate a
sparse workspace, and recover from interruption.

## Product promise by maturity

### Current alpha

“Create verified local history for large binary projects and inspect what the
engine stores.”

### Next product milestone

“Move a repository between two stores without resending known objects or
trusting hidden server state.”

### Differentiating proof

“Explain and reproduce a supported media change from exact source through edit
graph to rendition.”

### Long-term platform

“Carry an open creative history across tools, storage providers, teams, and
compute environments.”

## What Dits should not become

- A general cloud drive with version labels.
- A proprietary editor or codec.
- A hosted service with a second incompatible object model.
- A collection of impressive demos that bypass repository invariants.
- A benchmark site built from modeled or fabricated numbers.
- A universal claim to understand every media format.
- A P2P product whose discovery mechanism substitutes for authorization and
  repository consistency.

## Business model

Keep the trust core, formats, conformance suite, local CLI, and reference remote
protocol open. Charge for convenience and coordination:

- managed verified storage and transfer;
- team identity, policy, lock coordination, audit, and review;
- hosted render/build workers and reproducible caches;
- enterprise deployment, support, compliance, and migration;
- optional integrations that do not make the repository proprietary.

Storage alone is a commodity. The defensible product is trustworthy workflow,
interoperability, recovery, and integrations.

## Measures of progress

Do not use command count or roadmap breadth as the primary score.

Track:

- byte-exact reconstruction and corruption detection;
- peak ingest memory and write amplification;
- repository-format conformance and independent-reader compatibility;
- object lookup, pack repair, GC, and checkout at declared scales;
- real mutation reuse by corpus class;
- transferred bytes and recovery under network faults;
- successful migration and weekly use by design partners;
- time to understand, reproduce, and approve a creative change.

## One-sentence positioning

> **Dits is open version control for large media and asset pipelines: exact
> source history today, a verifiable graph of how every result was made
> tomorrow.**

Implementation truth remains in [docs/STATUS.md](docs/STATUS.md); execution is
ordered in [ROADMAP.md](ROADMAP.md); the technical basis is
[docs/research/technical-foundations.md](docs/research/technical-foundations.md).
