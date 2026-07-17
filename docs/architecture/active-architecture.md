# Active Architecture

**Maturity:** Current architecture with explicit Experimental and Design
boundaries.

This document is the canonical code map for the repository. It describes what
the root Cargo workspace builds, not the larger historical platform described
by older documents.

## 1. Canonical workspace

The root workspace contains:

```text
packages/dits-core   shared FastCDC/BLAKE3 engine
apps/cli             `dits` library and command-line binary
```

The historical cloud/backend experiment is isolated in
`legacy/backend-crates` with its own nested workspace. It is not part of the
root build and must not define canonical object or commit semantics.

`packages/dits-wasm` is a standalone workspace that wraps `dits-core` for the
web playground.

## 2. Trust boundary

The canonical trust core is:

```text
dits-core hashing/chunking
        ↓
apps/cli core object types
        ↓
object store + refs + repository transactions
        ↓
commands, media tools, VFS, remotes, UI
```

Code above the repository layer may orchestrate or present data. It must not
create an alternative hash, chunk, manifest, commit, verification, or
reachability implementation.

## 3. Current module map

### Shared engine: `packages/dits-core`

Responsibilities:

- BLAKE3 hash representation and calculation.
- FastCDC configuration profiles.
- Sequential and parallel chunk production.
- Chunk references and deterministic byte reconstruction helpers.
- WebAssembly-compatible default feature boundary.

This crate should remain small, deterministic, and free from CLI, filesystem,
network, hosted-service, or media-application policy.

### Repository primitives: `apps/cli/src/core`

Responsibilities include:

- hashes and hashers used by the repository;
- chunks and chunk references;
- index entries and file metadata;
- manifests;
- commits/authors;
- ignore rules;
- storage classification and strategy;
- diff and merge primitives.

Long-term direction: types that are part of the public repository format should
move behind explicit versioned encoders and conformance vectors. Rust type
layout or bincode output is not a public format.

### Local storage: `apps/cli/src/store`

Responsibilities include:

- loose content-addressed objects;
- refs/HEAD/branches;
- repository operations;
- hybrid libgit2 text storage;
- local locks;
- local and placeholder remote configuration;
- sync/serve support.

Required invariants:

1. Object paths are derived only from validated content IDs.
2. New immutable objects are published atomically.
3. Every read that crosses a trust boundary verifies length and digest.
4. Ref updates are atomic and divergence-safe.
5. Garbage collection starts from every protected root.
6. A failed operation cannot publish a manifest/ref that references missing
   objects.

### Command layer: `apps/cli/src/commands`

Responsibilities:

- argument-to-operation translation;
- user-facing validation and error messages;
- progress/output formatting;
- command-specific orchestration.

Commands should call library services. They should not own a second storage or
hash implementation.

### Binary: `apps/cli/src/main.rs`

Current state: the binary declares several source modules that are also exposed
by the `dits` library crate. This keeps some binary-relative paths compiling but
duplicates module compilation and permits type drift.

Target state:

```rust
use dits::{Repository, core, facr, mp4, p2p, segment, store, stream, vfs};
```

Only CLI parsing, process setup, exit codes, and presentation remain in the
binary crate. Library visibility should be made intentional rather than
duplicating modules.

### Media structure: `apps/cli/src/mp4`, `segment`, `proxy`

Responsibilities:

- MP4/ISOBMFF parsing and reconstruction;
- selected offset patching;
- segmentation/proxy workflows;
- exact fallback storage when a format is not safely understood.

This is a structure-aware layer over the byte CAS. It does not establish
semantic equivalence across re-encoding.

### FACR: `apps/cli/src/facr`

**Maturity:** Experimental.

Responsibilities:

- frame/photo content-addressed experiments;
- manifests and stores for decoded or encoded frame units;
- ingest/reconstruction through external media tools;
- frame-level diff/dedup experiments.

FACR must preserve imported originals and separate exact decoded identity,
encoded rendition identity, and perceptual candidate search.

### Streaming and VFS: `apps/cli/src/stream`, `vfs`

**Maturity:** Experimental; FUSE is feature-gated.

Responsibilities:

- local/random range serving demonstrations;
- cache and hydration logic;
- edit/segment stream experiments;
- FUSE filesystem integration.

A local demo is not a remote partial clone. Remote hydration becomes Current
only when a verified remote object source is wired through the same read path.

### P2P and remote transport: `apps/cli/src/p2p`, remote commands

**Maturity:** Scaffolding/Design.

Responsibilities today are exploratory. The protocol must first define
find-missing, object verification, resume, ref transactions, authorization, and
divergence behavior. QUIC, WebSocket, HTTP, or P2P discovery are transports,
not repository consistency models.

### Security: `apps/cli/src/security`

Responsibilities include encryption, key storage, integrity/audit support, and
security-oriented commands.

Security documentation must distinguish:

- integrity from authenticity;
- at-rest encryption from content-address equality leakage;
- repository-key encryption from convergent encryption;
- local commit metadata from signed provenance;
- parser robustness from cryptographic verification.

### Project, metadata, lifecycle, dependency, and hooks modules

These modules add policy and domain behavior above the repository core. They
may reference commits and objects but should not mutate immutable storage
semantics.

Hooks execute user-controlled programs and therefore require explicit trust and
failure policy.

## 4. Dependency rules

Allowed:

```text
commands -> repository/domain services -> core/store -> dits-core
media/domain services -> core/store -> dits-core
VFS/transport -> repository/object verification -> store
hosted service (future) -> published engine/protocol
```

Disallowed:

```text
dits-core -> CLI, filesystem, network, hosted service
store -> command presentation
historical backend -> separate canonical formats
transport -> unverified object publication
perceptual index -> exact object identity
web documentation -> invented command behavior
```

## 5. Maturity matrix

| Area | Maturity | Canonical evidence |
|---|---|---|
| Shared hashing/chunking engine | Current | `packages/dits-core` tests |
| Local object verification | Current | `store/objects.rs` tests |
| Local add/commit/checkout/history | Current | CLI integration tests |
| Hybrid Git text storage | Current | git engine and integration tests |
| MP4 structural path | Current, bounded support | parser/reconstruction tests |
| Local locks | Current | lock store/commands |
| FACR | Experimental | FACR modules and demos |
| Proxy/segmentation | Experimental | media modules/tests |
| FUSE | Experimental/feature-gated | `fuser` feature |
| Local HTTP serve | Current utility | serve command |
| Network push/pull/fetch/sync | Design/placeholders | `STATUS.md` |
| P2P/QUIC repository transfer | Design/scaffolding | p2p/stream modules |
| Hosted REST/DB/worker platform | Historical | `legacy/backend-crates` |
| Public SDK ecosystem | Design | no stable public protocol |
| Packfiles/tree v2 | Design | technical foundations |
| OTIO/C2PA/OpenAssetIO integration | Design | technical foundations |

## 6. Repository format boundary

Current repositories are implementation-versioned in practice but do not yet
have a complete public compatibility specification.

Before declaring 1.0, define:

- repository format marker and required feature bits;
- object kind/version encoding;
- canonical manifest and commit bytes;
- chunking algorithm/profile identifiers;
- encryption mode/envelope;
- atomic transaction/recovery rules;
- unknown-version behavior;
- migration and read-only compatibility window;
- fsck/repair semantics;
- test vectors.

A new writer must not silently emit a format older readers can misinterpret.

## 7. Data-safety invariants

### Add/ingest

- Observe a stable source or detect mutation.
- Verify every emitted object ID.
- Do not publish index state until all referenced objects exist.
- Bound memory by configured pipeline limits.
- Leave recoverable transaction state after interruption.

### Commit

- Reference a complete immutable tree/manifest.
- Use deterministic identity rules.
- Update the branch ref atomically after object durability.
- Never mutate an existing commit.

### Checkout

- Resolve the requested ref/commit unambiguously.
- Verify objects during read.
- Materialize through temporary files where replacement must be atomic.
- Preserve or explicitly report unsupported modes/symlinks/metadata.
- Never delete unrelated working data without a preview/force contract.

### Merge/sync

- Detect common ancestor and divergence.
- Keep binary conflict policy explicit.
- Never turn a failed fetch into a local ref overwrite.
- Require compare-and-swap for remote ref updates.
- Preserve both heads when automatic reconciliation is impossible.

### Garbage collection

- Include branches, tags, HEAD, stashes, locks/pins, transaction journals,
  promised objects, and protected exports as roots.
- Mark before sweep.
- Recheck or hold an exclusion mechanism before deletion.
- Keep quarantine/recovery options.

## 8. Documentation boundary

Current user documentation may describe only:

- commands present in `dits --help`;
- behavior executable in the root workspace;
- optional features with their build/runtime requirements;
- measured results with reproducible evidence.

Hosted API, database, Kubernetes, Redis, S3, SDK, multi-region, and incident
runbook documents are Design/Historical until backed by a canonical service
that imports the engine.

## 9. Refactoring sequence

1. Keep `dits-core` stable and independently tested.
2. Make public library modules expose only the operations needed by commands.
3. Move CLI-only modules under the binary or a `cli` module.
4. Replace binary `mod` redeclarations with imports from `dits`.
5. Add a compile-time/API test that the binary uses library types.
6. Remove duplicated allowances made only for binary-relative paths.
7. Measure clean and incremental build time plus release binary size.
8. Do not combine this refactor with an object-format migration.

## 10. Architecture review gate

A new subsystem is accepted only when it answers:

- Which layer owns it?
- Which lower-layer invariants does it depend on?
- Is its maturity Current, Experimental, Design, or Historical?
- Does it create persistent bytes or a public protocol?
- What versions and limits apply?
- How is corruption detected and recovered?
- What tests prove its data-safety contract?
- Can the local system remain useful without it?
- Does it reuse the canonical engine?
