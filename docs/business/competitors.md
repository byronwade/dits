# Competitive landscape

**Maturity:** Design

Competitive research snapshot. Verify external products from primary sources and do not
infer parity or superiority.

> Research snapshot, not a claim of product parity. Last reviewed: 2026-07-16.
> Product capabilities change; verify linked primary sources before publishing a
> comparison. Dits maturity is governed by [`docs/STATUS.md`](../STATUS.md).

## Executive view

Dits enters a mature market. Content-defined chunking, content-addressed
storage, large-binary versioning, locks, partial workspaces, streaming, and
review workflows all exist in established products. The opportunity is not to
pretend those primitives are new.

The product bet is to combine:

> exact local source history, media-aware storage, and an open reproducible
> graph of edits, dependencies, and renditions.

That combination remains a direction, not a demonstrated market advantage.

## Comparison by job

| Product/category | Strong at | Model or trade-off relevant to Dits | What Dits must prove |
|---|---|---|---|
| [Git LFS](https://git-lfs.com/) | Familiar Git hosting and pointer-based large-file storage | Whole objects live outside Git; broad ecosystem compatibility | Chunked history is worth a new format and workflow |
| [Hugging Face Xet](https://huggingface.co/docs/xet/) | Git-compatible large data, content-defined chunking, CAS deduplication, range reconstruction | Open protocol and Rust implementation make generic “Git plus CDC” non-unique | Media semantics and derivation provenance create additional value |
| [Perforce Helix Core](https://www.perforce.com/products/helix-core) | Mature large-binary workflows, locks, access controls, proxies, enterprise operations | Centralized administration and a long-established studio ecosystem | An open local-first model can be reliable and easier to adopt |
| [Unity Version Control](https://unity.com/solutions/version-control) | Game/3D workflows, branching, large files, locks, partial replicas | Integrated commercial team workflow, especially for Unity users | Mixed asset/code history and openness matter outside one ecosystem |
| [LucidLink](https://www.lucidlink.com/) | Streaming remote filespaces and low-friction access to large media | Primarily a storage-access model, not a Git-shaped history model | Version and derivation history solve a distinct, frequent problem |
| [Frame.io](https://frame.io/) | Media review, approvals, annotations, and creative collaboration | Review experience is more important than storage mechanics to many teams | Dits can complement review tools instead of rebuilding them |
| [DVC](https://dvc.org/) | Data/model pipeline versioning layered on Git and remote storage | Strong lineage concepts for technical data workflows | Media-specific graph semantics are useful and interoperable |
| Cloud drives | Simple sharing, sync, permissions, broad familiarity | Easy adoption; weak structured history and reproducibility | The extra workflow cost of version control pays back quickly |

## The most important benchmark: Xet

Xet invalidates several easy claims. Its published architecture includes Git
integration, a content-addressed store, content-defined chunking, deduplication,
and range reconstruction, and its core implementation is open source in Rust.

Therefore Dits must not claim uniqueness for:

- Git-shaped workflows over large files;
- content-defined chunking;
- chunk-level deduplication;
- a CAS implemented in Rust;
- efficient reconstruction of ranges from shared chunks.

Dits can differentiate only by proving value above that substrate: explicit
media structure, edit and dependency graphs, rendition provenance,
deterministic regeneration, and workflows that creative pipelines will adopt.

Primary sources:

- [Xet documentation](https://huggingface.co/docs/xet/)
- [xet-core repository](https://github.com/huggingface/xet-core)

## Established studio systems

Perforce and Unity Version Control set a high bar for operational behavior:
locks, partial workspaces, access control, administrative tooling, geographic
distribution, and support. Dits does not currently offer a working remote, a
hosted control plane, or equivalent operations.

The correct near-term posture is not “replace Perforce.” It is:

1. earn a place in a small team’s local or pilot workflow;
2. make the open data model independently valuable;
3. demonstrate migration, recovery, and interoperability;
4. add team operations only when the protocol is safe.

Primary sources:

- [Perforce Helix Core overview](https://www.perforce.com/products/helix-core)
- [Unity Version Control overview](https://unity.com/solutions/version-control)

## Storage and review products

LucidLink and Frame.io solve adjacent problems extremely well. Fast access,
review, approval, and creative UX may matter more to users than version-control
architecture. Dits should integrate with these categories and track the
provenance of their inputs and outputs before trying to recreate their entire
experience.

Primary sources:

- [LucidLink](https://www.lucidlink.com/)
- [Frame.io](https://frame.io/)

## Positioning implications

### Say

- “Open, local-first version control for large media and asset pipelines.”
- “Exact source history today; a reproducible media graph is the direction.”
- “Dits is exploring how version control and build-lineage ideas apply to
  creative assets.”
- “The current alpha is for evaluation on disposable or backed-up projects.”

### Do not say

- “The only VCS with chunk-level deduplication.”
- “Production-ready replacement for Perforce.”
- “Instant petabyte-scale media collaboration.”
- “Cheaper than X by Y%” without a reproducible total-cost study.
- “No competitor understands media” without a narrow, sourced definition.

## Competitive validation plan

Comparisons should use public, repeatable workloads:

1. commit an initial mixed code and asset workspace;
2. make controlled insertions, metadata changes, re-encodes, and opaque binary
   edits;
3. measure on-disk growth, ingest time, checkout time, and byte fidelity;
4. repeat with Git LFS, Xet, and at least one studio-oriented system where
   licensing permits;
5. publish the corpus, commands, hardware, versions, warm/cold cache state, and
   raw results;
6. report failures and unfavorable results alongside wins.

Until that suite exists, competitive statements are hypotheses.
