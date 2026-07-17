# Product differentiators under investigation

**Maturity:** Design

Research backlog; candidates require implementation and evidence before entering product
messaging.

> Research backlog, not shipped capability. Last reviewed: 2026-07-16. Current
> behavior is defined by [`docs/STATUS.md`](../STATUS.md); public language is
> defined by [`docs/marketing/positioning.md`](../marketing/positioning.md).

## The coherent bet

Dits should not try to differentiate through an unrelated list of AI,
collaboration, storage, and editor features. The focused architectural bet is:

> Connect exact source history to a reproducible graph of edits, dependencies,
> and renditions through an open local-first model.

## Candidate differentiators

### Explicit creative intent

Represent trims, selections, transforms, grades, timeline changes, and asset
relationships explicitly when a source format or interchange model exposes
them. Do not infer certainty from an opaque export.

Proof required:

- a versioned schema with deterministic identifiers;
- round trips through at least one real tool workflow;
- conflict and merge rules that do not silently change intent;
- preservation of exact archival source separately from derived media.

### Rendition provenance

Link proxies, thumbnails, review encodes, and final outputs to source objects,
edit records, tool versions, and configuration. A rendition can then be audited,
invalidated, or regenerated when its dependencies change.

Proof required:

- deterministic rebuilds where claimed;
- explicit fidelity criteria where exact bytes are not reproducible;
- useful invalidation behavior on representative projects;
- bounded cost and recovery behavior.

### Asset dependency graph

Track how project documents, source assets, tools, and derived outputs depend on
one another. This borrows from build and package systems rather than attempting
to make Dits a creative editor.

Proof required:

- import of a real game or virtual-production dependency graph;
- cycle, missing-input, and version-skew handling;
- integration with existing build tools rather than a closed replacement.

### Open collaboration semantics

Exchange the same objects and graph through a documented protocol. Transports
are interchangeable; verification, atomic refs, identity, authorization,
resumability, and recovery are not.

Proof required:

- published specification and conformance fixtures;
- two independent implementations or clients;
- failure injection for corruption, interruption, races, and version skew;
- measured end-to-end performance over HTTP before optional transports.

### Assisted search

Perceptual or semantic models may help users find related assets or candidate
matches. Their outputs are annotations and indexes, never cryptographic object
identity or proof that two assets are equivalent.

Proof required:

- disclosed model/index versions and reproducibility limits;
- precision/recall evaluation on a licensed corpus;
- privacy, opt-in, and local-processing expectations;
- graceful behavior without model services.

## Ideas explicitly retired from the product claim

- a generic “AI creative director”;
- universal, lossless conversion between all creative tools;
- automatic merging of opaque binary edits;
- real-time multi-user editing before safe asynchronous collaboration;
- proprietary format lock-in presented as “tool freedom”;
- unmeasured instant-scale, storage-savings, pricing, or customer claims.

These may inspire experiments, but they do not define Dits and must not appear
as available features.

## Evaluation order

1. Make local object and history semantics trustworthy.
2. Stabilize and scale the persistent format.
3. Prove one dependency/rendition workflow in game or virtual production.
4. Prove one timeline/edit workflow in post-production.
5. Specify remote collaboration over the same model.
6. Add search or model-assisted metadata only where it improves a validated job.
