# Product positioning

**Maturity:** Current

Public messaging authority; capability claims remain subordinate to docs/STATUS.md and
measured evidence.

> Public messaging authority. Last reviewed: 2026-07-18. Product maturity and
> feature availability are governed by [`docs/STATUS.md`](../STATUS.md).

## Positioning statement

**Dits is open, local-first version control for large media and asset pipelines.**

It gives teams exact source history today and is building toward a reproducible
graph of edits, dependencies, and renditions that can move through an open,
verified protocol.

Hero clarifier:

> Dits gives mixed code-and-media projects Git-shaped local history with
> chunked, content-addressed storage. Exact local workflows work today;
> semantic media and team sync are roadmap.

Short form:

> Version the source. Explain every result.

## The problem

Creative and asset-heavy teams usually choose between two incomplete models:

- source-control systems that understand history but treat large binary assets
  poorly;
- storage and review products that move files well but do not provide a
  reproducible account of how an output was made.

Dits is designed to connect exact bytes, project structure, edit intent,
dependencies, and derived media without hiding the underlying history.

## Initial audience

The first wedge is **small and mid-sized game and virtual-production teams**.
They combine Git-shaped engineering practices with large, frequently changing
binary assets and can adopt a local CLI before a hosted collaboration service
exists.

The next audience is post-production and VFX teams that need frame-aware
history, project interchange, and reproducible proxies or renders.

## Product promise by horizon

| Horizon | Promise |
|---|---|
| Today: alpha | Exact local history for mixed text and large binary projects, with chunked content-addressed storage and byte-exact checkout. |
| Next: semantic media | Represent edits, dependencies, frames, and renditions explicitly; prove the model on real fixtures and workflows. |
| Later: collaboration | Share the same model through a verified remote CAS protocol with atomic refs, resumable transfer, authorization, and recovery. |

## Four product layers

1. **Exact source history** — commits, branches, tags, merges, manifests, and
   deterministic reconstruction.
2. **Media-aware storage** — content-defined chunking, MP4 structure awareness,
   deduplication, integrity verification, and local proxy experiments.
3. **Reproducible asset graph** — explicit edits, dependencies, timelines, and
   renditions instead of opaque exported blobs.
4. **Open collaboration protocol** — a future transport-independent protocol
   for exchanging objects and updating refs safely.

Only the first two layers are substantially present in the current alpha. The
third is experimental and the fourth is a roadmap commitment.

## Defensible differentiation

Dits should not claim that content-defined chunking, a CAS, large-file support,
locking, or streaming are unique. Mature products already provide parts of that
stack.

The differentiated bet is their composition:

> exact version history plus a reproducible graph of media edits, dependencies,
> and renditions, expressed through an open data model.

That is closer to applying Git plus Bazel or Nix ideas to media pipelines than
to building another Git LFS-compatible file store.

## Evidence rules

Public claims must be one of:

- **Current** — exercised by a real command and covered by a relevant test;
- **Experimental** — runnable but the format, fidelity, or UX may change;
- **Roadmap** — design intent with no implication that it works today;
- **Measured** — tied to a committed artifact, environment, date, and method.

Use “designed to” for unimplemented architecture. Do not convert a component
microbenchmark into a repository-level performance claim.

## Messaging guardrails

- Say **local-first**, not “fully distributed.”
- Say **alpha**, not “production-ready,” “enterprise-ready,” or “battle-tested.”
- Network `push`, `pull`, `fetch`, `sync`, P2P, hosted service, SDKs, and NLE
  plug-ins are not shipped.
- FACR, edit logs, proxy workflows, and VFS behavior are experimental unless the
  status page promotes a particular path.
- Do not promise “instant” clones, petabyte scale, percentage savings, or cost
  reductions without a reproducible benchmark.
- Do not market a roadmap concept as a CLI command merely because a placeholder
  command exists.

## Approved message bank

- **Category:** open, local-first version control for large media and assets.
- **Tagline:** Version the source. Explain every result.
- **Technical:** Exact local history with content-addressed, chunked storage.
- **Vision:** A reproducible graph of source, edits, dependencies, and renditions.
- **CTA:** Try the local alpha. Star Dits on GitHub. Contribute a fixture or
  failure case.

## Messages to retire

- “Distributed Intelligent Transfer System” as the product definition.
- “The AI-powered creative production platform.”
- “100 GB projects feel like 1 MB projects.”
- “Only Dits has chunk-level deduplication.”
- “Frame-level versioning is production-ready.”
- Any launch date, market-share target, ARR target, or invented customer result.

## Calls to action

The appropriate alpha calls to action, in order, are:

1. install the npm-packaged CLI;
2. try it on a disposable or backed-up project;
3. star the repository if the problem resonates;
4. contribute a real-world fixture, failure case, or design review;
5. run the verification suite or reproduce a benchmark; and
6. follow the dependency-ordered [`ROADMAP.md`](../../ROADMAP.md).

## GitHub storefront

Keep GitHub repository settings aligned with this document:

- **About:** `Open-source, local-first version control for large media and binary assets. Exact local history today; explainable media pipelines next.`
- **Website:** `https://dits.byronwade.com`
- **Topics:** `rust`, `version-control`, `large-files`, `binary-files`,
  `local-first`, `content-addressable-storage`, `fastcdc`, `blake3`, `media`,
  `game-development`, `virtual-production`, `vfx`, `post-production`,
  `creative-tools`, `developer-tools`
- **Social preview:** `.github/assets/dits-social-preview.png` (1280×640)

The About field must never describe Dits as a shipped distributed VCS while
network repository exchange remains Design.
