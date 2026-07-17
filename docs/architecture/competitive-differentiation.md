# Architectural differentiation

> Product design, not a list of shipped advantages. Last reviewed: 2026-07-16.
> See [`docs/STATUS.md`](../STATUS.md) and
> [`active-architecture.md`](active-architecture.md) for current reality.

## The architectural bet

Chunking and a content-addressed store are necessary infrastructure, not the
finished product. Dits is designed to connect four kinds of state:

| Layer | Record | User value |
|---|---|---|
| Source | Exact immutable bytes and manifests | Recover any committed input |
| Structure | Containers, project documents, timelines, and asset relationships | Understand meaningful organization instead of one opaque blob |
| Intent | Explicit edits and transforms where the source format permits | Explain what changed and reduce avoidable derived duplication |
| Derivation | Tool/configuration dependencies and generated renditions | Reproduce, invalidate, or audit an output |

The long-term differentiator is the integrity of the links between these
layers—not any single storage primitive.

## Why local-first

The local repository is the reference implementation of object semantics. This
keeps correctness testable without a service and lets users own the durable
format. A future remote should exchange and verify the same objects rather than
become a separate source of truth.

Local-first does not mean “a complete distributed system.” Today, network
commands are placeholders and peer transfer is not implemented.

## Why explicit derivation

An exported video or packaged game asset is an opaque result. Binary similarity
can sometimes reduce storage, but it cannot reliably recover artistic intent or
build provenance. Dits should preserve source plus explicit operations whenever
the workflow exposes them, while retaining the final bytes when exact archival
recovery requires it.

This leads to three design rules:

1. Never confuse a proxy, perceptual match, or decoded frame with the exact
   archival source.
2. Prefer deterministic, versioned edit records over inference from an opaque
   re-export.
3. Record tool and configuration dependencies when a rendition claims to be
   reproducible.

## Where the claim is unproven

- The current FACR and photo-edit paths are experimental.
- MP4 behavior needs a published real-media compatibility corpus.
- There is no stable cross-tool semantic schema.
- There is no working remote protocol or independent implementation.
- End-to-end storage and workflow advantages have not been benchmarked against
  Xet, Git LFS, Perforce, or Unity Version Control.

These are roadmap gates, not copywriting details.

## Proof required

The architecture becomes a defensible product advantage when Dits can show:

- byte-exact round trips across a disclosed supported-format matrix;
- deterministic identifiers and manifests across supported platforms;
- edit and dependency records that survive import/export through at least one
  real production workflow;
- derived outputs that can be reproduced or invalidated correctly;
- materially better storage or comprehension on public workloads;
- remote conformance under corruption, interruption, races, and version skew.

## Relationship to adjacent systems

- **Git LFS and Xet** prove that large objects can coexist with Git workflows.
- **Perforce and Unity Version Control** define expectations for studio-scale
  binary collaboration and operations.
- **DVC, Bazel, and Nix** demonstrate the value of explicit derivation and
  reproducibility.
- **OpenTimelineIO** is an important interchange model for editorial timelines.
- **LucidLink and Frame.io** demonstrate that access and review UX are distinct
  product layers worth integrating with.

Dits should interoperate where possible and compete only where its data model
creates measurable workflow value.
