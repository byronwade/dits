# Dits Documentation Guide

**Maturity:** Current

This directory contains Current behavior, Experimental work, Design research,
and Historical material. Read the maturity label before treating a document as
implementation truth.

## Start here

| Question | Authority |
|---|---|
| What works today? | [`STATUS.md`](STATUS.md) |
| What is Dits trying to become? | [`../REVIEW-AND-VISION.md`](../REVIEW-AND-VISION.md) |
| What should be built next? | [`../ROADMAP.md`](../ROADMAP.md) |
| What code is canonical? | [`architecture/active-architecture.md`](architecture/active-architecture.md) |
| What are the core objects and invariants? | [`concepts.md`](concepts.md) |
| What research supports the architecture? | [`research/technical-foundations.md`](research/technical-foundations.md) |
| What performance work matters? | [`performance/engineering-plan.md`](performance/engineering-plan.md) |
| How is this taught and standardized? | [`education/course-standard.md`](education/course-standard.md) |
| How do I use the CLI? | [`user-guide/cli-reference.md`](user-guide/cli-reference.md) |
| How should Dits be positioned? | [`marketing/positioning.md`](marketing/positioning.md) |
| How do we grow the GitHub community? | [`marketing/github-growth.md`](marketing/github-growth.md) |

## Maturity model

### Current

Implemented by the canonical root workspace and covered by tests. Current does
not mean production-ready or compatible forever.

### Experimental

Executable code or a demonstration with named limitations. It may change or
fail outside its tested fixtures.

### Design

Proposed architecture, protocol, API, product, or operations behavior. It is
not usable merely because a schema, command name, diagram, or example exists.

### Historical

Retained for context. It must not drive current implementation decisions unless
revived through an ADR and migrated to the canonical engine.

## Documentation hierarchy

```text
STATUS.md                                  shipped truth
../ROADMAP.md                              ordered unfinished work
architecture/active-architecture.md        code ownership and invariants
concepts.md                                current object/repository model
adr/                                       accepted architectural decisions
research/                                  evidence and open questions
performance/                               measured evidence and engineering plan
user-guide/                                current CLI behavior
education/                                 course and conformance direction
marketing/ + business/                     positioning and business design
api/ + sdks/ + deployment/ + operations/   mostly Design/Historical
superpowers/                               dated experiments and implementation notes
legacy/                                    historical code, outside this directory
```

## Capability evidence

A public capability requires all applicable evidence:

- a reachable implementation in the root workspace;
- tests for success, corruption, interruption, and limits;
- an exact command/API entry point;
- persistence and compatibility rules if durable bytes are created;
- a reconstruction or fidelity contract for media;
- raw benchmark evidence for performance claims;
- safe fallback and recovery behavior.

Scaffolding, a mocked UI, a dated plan, an in-process demo, or historical backend
code is not capability evidence.

## Persistent-format changes

Changes to object IDs, chunking profiles, manifests, trees, commits, refs,
indexes, packs, encryption envelopes, bundles, or wire messages require:

1. an ADR;
2. compatibility and migration analysis;
3. canonical encoding rules and allocation limits;
4. positive and malformed conformance vectors;
5. version/feature negotiation behavior;
6. independent verification where the surface is public.

## Media claims

Media documentation must distinguish:

- exact source bytes;
- supported structural interpretation;
- decoded identity under a named profile;
- encoded rendition identity;
- fidelity equivalence under a named metric/profile;
- perceptual candidate similarity.

Similarity can suggest reuse. It cannot establish equality, provenance,
authorization, or lossless reconstruction.

## Performance claims

Use one of four labels:

- **Measured** — linked to raw evidence, commit, corpus, command, and hardware.
- **Modeled** — formula and assumptions are shown.
- **Target** — an engineering gate, not an achieved result.
- **Example** — illustrative only.

Avoid unlabeled words such as “instant,” “unlimited,” “petabyte-scale,”
“production-ready,” “zero-copy,” or “linear scaling.”

## Authoring workflow

When behavior changes:

1. change implementation and tests;
2. update `STATUS.md`;
3. update the CLI reference and relevant Current docs;
4. update `ROADMAP.md` if an acceptance gate moved;
5. update website status/marketing copy;
6. run:

```bash
bash scripts/check-cli-docs.sh
npm --workspace apps/web run test:ci
```

## AI coding entry point

Agents should read, in order:

1. [`STATUS.md`](STATUS.md)
2. [`architecture/active-architecture.md`](architecture/active-architecture.md)
3. [`concepts.md`](concepts.md)
4. relevant ADRs
5. [`../ROADMAP.md`](../ROADMAP.md)
6. the scoped implementation and tests

Do not infer Current behavior from `legacy/`, `superpowers/`, hosted API docs, or
website marketing copy.
