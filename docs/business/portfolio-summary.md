# Dits product brief

**Maturity:** Current

Current alpha product brief with future layers explicitly separated from shipped local
behavior.

> Current strategy summary. Last reviewed: 2026-07-18.

## One sentence

**Dits is open, local-first version control for large media and asset pipelines.**

It gives mixed code-and-media projects Git-shaped local history with chunked,
content-addressed storage. Exact local workflows work today; a reproducible
graph of edits, dependencies, and renditions plus team sync are roadmap.

## Why it matters

Media and asset pipelines have source files, project documents, edit decisions,
tool dependencies, proxies, and final outputs. Most systems preserve only parts
of that process. Source-control tools have strong history but weak large-binary
economics; storage and review systems move assets well but often treat outputs
as opaque files.

Dits aims to make the relationship between source, intent, and result explicit
without locking the durable history inside a hosted service.

## Current product

The v0.1.5 alpha includes a local Rust CLI with:

- repository initialization and Git-shaped history operations;
- chunked content-addressed storage using FastCDC and BLAKE3;
- exact local reconstruction and integrity-oriented storage behavior;
- hybrid handling for text and binary assets;
- MP4 structure-aware code;
- local locking, metadata, dependency, lifecycle, and security-related paths;
- experimental FACR, photo edit-log, proxy, and VFS functionality.

Use the alpha only on disposable or independently backed-up projects. The
authoritative matrix is [`docs/STATUS.md`](../STATUS.md).

## Not shipped

- working network `push`, `pull`, `fetch`, `sync`, or network clone;
- peer-to-peer transfer or QUIC delta transport;
- a hosted Dits service;
- supported public SDKs or NLE/DCC plug-ins;
- stable cross-tool semantic-media formats;
- enterprise administration or service guarantees.

## Product direction

1. **Credible local engine** — safe writes, recovery, deterministic formats,
   broad real-media fixtures.
2. **Scalable object storage** — bounded-memory ingest, packs, indexes, trees,
   and measured performance.
3. **Semantic media graph** — explicit source, edit, dependency, timeline, and
   rendition records.
4. **Verified collaboration** — transport-independent object exchange, atomic
   refs, resumability, identity, authorization, and lock leases.
5. **Team experience** — policy, review integrations, observability, support,
   and managed operation.

## Initial market wedge

Small and mid-sized game and virtual-production teams are the first audience:
they already use Git-shaped workflows, combine code with large binary assets,
and can evaluate a useful local engine before a remote service exists.

Post-production and VFX are the next expansion path after semantic timelines,
proxies, renditions, and real-media compatibility have stronger evidence.

## Competitive posture

Dits does not own the primitives. Git LFS, Xet, Perforce, Unity Version Control,
LucidLink, Frame.io, and DVC each solve meaningful parts of the problem. In
particular, Xet already combines Git, content-defined chunking,
content-addressed storage, and deduplication in an open Rust implementation.

The differentiating hypothesis is the connection between exact history and a
reproducible media/asset graph. It must be proven through public fixtures,
correctness reports, end-to-end benchmarks, and design-partner workflows.

## Business model

Keep the local engine, durable format, and core protocol open. A future paid
product may provide managed storage, identity, policy, review integrations,
operations, recovery, support, and enterprise deployment. There are no active
paid plans or published prices today.

## Near-term success

- safe round trips on a disclosed media compatibility corpus;
- deterministic format and conformance fixtures;
- repeat users on real backed-up projects;
- reproducible storage and workflow benchmarks;
- design partners contributing pipeline constraints and failure cases;
- a reviewed remote protocol before any transport-specific implementation.

## Start here

```bash
npm install -g @byronwade/dits
dits --version

mkdir dits-evaluation
cd dits-evaluation
dits init
dits status
```

Then read the [getting-started guide](../user-guide/getting-started.md), the
[current status](../STATUS.md), and the [roadmap](../../ROADMAP.md).
