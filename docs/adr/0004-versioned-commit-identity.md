# ADR 0004: Versioned and Framed Commit Identity

**Maturity:** Current

Accepted ADRs govern new work, but they do not by themselves prove that every consequence
is implemented; implementation status remains authoritative.

- **Status:** Accepted
- **Date:** 2026-07-16

## Context

The original 0.1.x commit digest concatenated parents, manifest, message,
author, and timestamp bytes without field tags or lengths. It also serialized a
committer but omitted that field from the digest. This created two integrity
gaps:

- changing only the committer did not change the identity; and
- different variable-field boundaries could produce the same input byte stream.

Canonical writers copied author to committer, so released commits normally use
equal values for those fields. Existing repositories still need a read path.

## Decision

New commits use the `dits-commit-v2\0` identity domain. The digest input then
contains:

1. an explicit marker for an absent or present primary parent;
2. the additional-parent count followed by each fixed-size parent digest;
3. the fixed-size manifest digest; and
4. message, author name/email, committer name/email, and RFC 3339 timestamp as
   unsigned 64-bit big-endian length followed by exact UTF-8 bytes.

The object store verifies a commit before writing it. Readers first verify the
v2 identity. They may accept the legacy digest only when committer exactly
equals author, matching the invariant of the canonical legacy writer. A legacy
object with a different or modified committer fails closed.

This compatibility verifier is a read bridge, not permission for new writers
to emit legacy identities. A future repository envelope should record the
object version explicitly and ship conformance vectors.

## Consequences

- Every serialized semantic commit field is bound to new commit identities.
- Field-boundary ambiguity is removed by framing.
- Canonically written 0.1.x commits remain readable.
- Hand-crafted legacy commits with a distinct committer are rejected because
  their omitted field cannot be authenticated.
- Commit IDs created after this decision differ from the legacy algorithm even
  when their visible values are otherwise identical.

## Enforcement

- `Commit::new` and `Commit::new_merge` emit only v2 identities.
- `ObjectStore::store_commit`, `load_commit`, and `dits fsck` verify identity.
- Tests cover committer tampering, the gated legacy bridge, and a legacy
  name/email boundary collision that v2 distinguishes.
- The broader pre-1.0 compatibility policy remains in
  [ADR 0003](0003-pre-1.0-repository-compatibility.md).
