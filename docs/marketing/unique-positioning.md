# Audience and go-to-market strategy

> Planning document. Last reviewed: 2026-07-16. All public copy must follow
> [`positioning.md`](positioning.md), and all feature claims must follow
> [`docs/STATUS.md`](../STATUS.md).

## Category

**Open, local-first version control for large media and asset pipelines.**

Dits competes for workflows, not only storage. The goal is to make exact asset
history and reproducible derivation a normal part of creative production.

## Initial wedge

Start with small and mid-sized **game and virtual-production teams** that:

- already understand commits, branches, and build graphs;
- keep code beside large, frequently changing binary assets;
- feel the cost of whole-file history and manual asset handoffs;
- can evaluate a local CLI without waiting for a hosted service;
- are technically able to contribute representative fixtures and failure cases.

This wedge gives Dits a credible adoption path while the remote protocol and
hosted product remain unbuilt.

## Expansion sequence

| Audience | Entry problem | Capability that must be credible first |
|---|---|---|
| Game and virtual production | Mixed code/assets, binary churn, reproducible builds | Reliable local history, format stability, dependency graph |
| Post-production and VFX | Version sprawl, proxy/rendition provenance, project interchange | Semantic media model, real fixtures, dependable proxy and timeline flows |
| ML and scientific media | Large data artifacts and derivation lineage | Stable object model, reproducible pipelines, policy and remote CAS |
| Enterprise studios | Governance, global transfer, support | Verified remote protocol, identity, recovery, observability, administration |

## Jobs to be done

- Replace `final_v27` with inspectable history.
- Keep exact source assets without storing every revision as an unrelated blob.
- See how project files, media, and derived outputs depend on one another.
- Reproduce a proxy or rendition from committed inputs.
- Move only verified missing objects when collaboration ships.

## Adoption motion

### Now: technical design partners

- Publish transparent alpha status and reproducible component benchmarks.
- Ask contributors for representative media fixtures and destructive edge cases.
- Demonstrate local commit, history, diff, checkout, and integrity recovery.
- Build trust through design docs, ADRs, and compatibility tests.

### Next: workflow pilots

- Select one game/virtual-production pipeline and one post-production pipeline.
- Define success before each pilot: correctness, storage behavior, recovery, and
  time-to-understand a change.
- Turn pilot evidence into fixtures and regression tests, not unsupported case
  studies.

### Later: team product

- Offer a hosted or self-managed remote only after protocol conformance,
  authorization, atomic refs, resumability, and recovery pass failure tests.
- Monetize operations, policy, integrations, support, and managed storage while
  keeping the core format and local engine open.

## Content strategy

Prioritize artifacts that let technical buyers verify the thesis:

1. real-media correctness reports;
2. repeatable storage and end-to-end workflow benchmarks;
3. architectural explanations of objects, manifests, and derivation graphs;
4. migration guides with explicit limitations;
5. design-partner stories with disclosed methods and sample characteristics.

Avoid speculative AI demos, invented savings calculators, generic category
matrices, or comparisons whose facts cannot be sourced.

## Success measures

Near-term measures are learning and reliability measures, not vanity growth:

- repeat users on real, backed-up projects;
- representative fixtures added to the conformance corpus;
- byte-exact round trips across the supported matrix;
- successful recovery from injected interruption and corruption;
- time required for a new user to install, commit, inspect, and restore;
- design partners willing to evaluate the next release.

Revenue targets, market-share targets, pricing tiers, and launch dates remain
open until the product has usage evidence and a reliable collaboration path.
