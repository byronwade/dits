# Engineering Milestones

**Maturity:** Design. This mirrors [`../../ROADMAP.md`](../../ROADMAP.md).

The former nine-phase roadmap mixed completed local commands with unfinished
network, cloud, and semantic systems. Dits now uses dependency-ordered
milestones with measurable exit gates.

| Milestone | Outcome | Status |
|---:|---|---|
| 0 | Credible, bounded, crash-safe local engine | Active |
| 1 | Versioned repository format and conformance | Active design |
| 2 | Pack/index/tree scale | Planned |
| 3 | Exact-CAS semantic media proof | Experimental/design |
| 4 | Verified remote CAS and ref transactions | Design |
| 5 | Adoptable team workflow and integrations | Planned |
| 6 | Ecosystem and standardization | Planned |

## Dependency graph

```text
data safety
    ↓
repository contract
    ├── scale: trees, packs, indexes
    ├── semantic media graph
    └── remote CAS and ref transactions
              ↓
       team workflow
              ↓
 ecosystem and standardization
```

## Milestone 0 — credibility and safety

Deliver bounded-memory ingest, atomic publication, mutation detection, golden
media fixtures, and destructive failure tests.

Exit only when a file larger than the configured memory budget can be ingested
and reconstructed exactly without publishing partial state after interruption.

## Milestone 1 — repository contract

Version all durable object kinds, canonical encodings, hash domains, chunking
profiles, indexes, refs, encryption envelopes, and migration behavior. Publish
conformance vectors and an independent verifier.

Exit only when independent code can reproduce and verify normative vectors and
unsupported versions fail safely.

## Milestone 2 — scale

Add tree objects, immutable packs, rebuildable indexes, multi-pack lookup,
indexed reachability, and safe repack/GC coordination.

Exit only after a million-object fixture, corruption repair, cold/warm random
reads, and repack identity preservation are measured.

## Milestone 3 — semantic media proof

Preserve exact masters, define decoded identity profiles, import/export a
supported OTIO subset, store non-destructive edit intent, and produce separately
addressed renditions with complete recipes and fidelity contracts.

Exit only when two supported implementations agree on the declared identity
profile or the incompatibility is documented and the profile corrected.

## Milestone 4 — verified remote CAS

Specify and implement find-missing, object streaming, packs, resume,
availability, bundles, lock leases, and compare-and-swap ref transactions over
an HTTP reference transport. Optional QUIC and P2P must pass the same protocol
suite.

Exit only when two stores exchange a repository, reproduce exact checkout
hashes, survive hostile-network tests, and never publish stale refs.

## Milestone 5 — team workflow

Ship migration, sparse workspaces, remote locking, status/transfer UX, and one
deep game/virtual-production toolchain integration. Validate with design
partners.

Exit only when a real team can migrate in, work weekly, recover, and export
without proprietary repository state.

## Milestone 6 — ecosystem

Publish stable schemas, generated SDKs, independent readers, adapters,
conformance reports, course labs, and any optional hosted control plane.

Exit only when interoperability is demonstrated, not merely documented.

## Current local features from the old phase model

Local chunking, Git-like history, hybrid text/binary storage, selected MP4
structure handling, local locks, lifecycle commands, proxy generation, and
feature-gated FUSE remain real where listed in
[`../STATUS.md`](../STATUS.md). Their existence does not imply that the old
remote, P2P, hosted, or universal-media phase claims are complete.
