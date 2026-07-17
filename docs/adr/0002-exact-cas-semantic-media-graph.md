# ADR 0002: Exact CAS Below a Semantic Media Graph

**Maturity:** Current

Accepted ADRs govern new work, but they do not by themselves prove that every consequence
is implemented; implementation status remains authoritative.

- **Status:** Proposed
- **Date:** 2026-07-16

## Context

Content-defined byte chunking can reuse unchanged byte ranges. It cannot
guarantee reuse after video/audio re-encoding, image recompression, global
color transforms, encryption, or other operations that rewrite most bytes.

Calling every visually small edit a small storage delta would therefore
overpromise. At the same time, replacing original media with a proprietary
canonical codec would weaken archival fidelity, interoperability, and user
trust.

Dits needs both exact reconstruction and useful understanding of creative
changes.

## Decision

Use a layered identity model:

1. **Exact original/rendition bytes** remain immutable CAS objects.
2. **Media structure objects** describe container/sample relationships without
   replacing exact bytes.
3. **Decoded frame/audio identities** use an explicit canonical decode profile.
4. **Semantic edit graphs** record non-destructive operations and source
   references.
5. **Perceptual features** are search indexes for candidate relationships, not
   object IDs.
6. **Residual objects** are allowed only when the declared target can be
   reconstructed and verified under its exact/fidelity contract.
7. **Provenance claims** are separate signed objects or external C2PA manifests,
   not implied by ordinary commit metadata.

Dits should import/export established interchange concepts—particularly
OpenTimelineIO, OpenAssetIO, OpenUSD, OpenColorIO/ACES identifiers, and C2PA—
rather than making a proprietary editor or codec a prerequisite.

## Consequences

Positive:

- original masters remain verifiable;
- Dits-owned edits can reuse sources without flattening;
- visual/structural diff can coexist with byte-exact history;
- lossy external exports are represented honestly;
- media semantics can evolve independently from the CAS;
- third-party tools can interoperate through adapters.

Costs:

- canonical decoded identities require precise color/pixel/audio rules;
- perceptual indexing and residual selection are compute-heavy;
- semantic imports from NLEs are incomplete and format-specific;
- the object model and conformance suite become more sophisticated.

## Rejected alternatives

### Byte chunking alone

Insufficient for re-encoded media and semantic diff.

### Perceptual hash as object identity

Unsafe because collisions and transform sensitivity can substitute nonidentical
content.

### Replace originals with one Dits codec

Creates lock-in and cannot guarantee preservation of every source bitstream or
metadata contract.

### Build a full editor first

Expands product scope before storage, compatibility, and interchange contracts
are stable.

## Acceptance criteria

This ADR can move to Accepted when Dits has:

- a published exact/decoded/perceptual identity specification;
- at least one deterministic decoded-frame profile with cross-tool vectors;
- original-byte preservation in FACR ingest;
- an edit-graph format with one OTIO adapter;
- a visual diff that labels exact and inferred relationships separately; and
- recovery/compatibility tests for all new object kinds.
