# Dits Implementation Status

**Maturity:** Current

**Product version:** 0.1.5

**Last repository review:** 2026-08-04

This file is the authority for public capability claims. Command-level truth is
checked against `dits --help` by `scripts/check-cli-docs.sh`. A design, test,
scaffold, or demo does not make a feature Current.

## Canonical product boundary

The root Cargo workspace builds:

```text
packages/dits-core   shared deterministic chunking/hashing engine
apps/cli             `dits` library and command-line binary
```

`packages/dits-wasm` is a standalone wrapper used by the web playground. The
former hosted/backend crate workspace is quarantined under
`legacy/backend-crates`; it is Historical and does not define current object,
repository, protocol, or product behavior.

## Current — local and offline

### Repository and history

- Initialize, stage, inspect, commit, log, and check out local repositories.
- Branch, switch, tag, diff, merge, show, reflog, bisect, rebase, cherry-pick,
  reset, restore, stash, grep, blame, describe, shortlog, worktree, sparse
  checkout, hooks, archive, maintenance, completions, clean, read-only GC
  reporting, and fsck.
- Hybrid storage routes supported text workflows through libgit2 and large
  binary content through Dits manifests/chunks.
- Fail-closed local filesystem clone, including validated Dits objects, refs,
  local configuration, and the embedded Git object database needed to
  materialize the source HEAD or an explicitly selected branch. Metadata
  symlinks/special files and destinations inside the source are rejected before
  destination creation; checkout failure returns nonzero and leaves the
  incomplete destination available for inspection.

Named limitations:

- Local clone copies committed object/ref/config state, not local indexes,
  working-tree changes, locks, audit records, generated proxy caches, metadata
  caches, lifecycle records, or experimental project side stores.
- Reflog recording covers commit and checkout actions. Other ref-changing
  commands may not yet append entries; when a reflog file is absent, `dits
  reflog` labels and displays a limited view reconstructed from commit history.
- `restore --ours/--theirs` fails closed; merge-conflict resolution is not
  implemented.
- Destructive GC is disabled. `dits gc --dry-run` reports candidate unreachable
  objects; it does not delete objects or locks. Reachability and a quarantine
  policy must be complete before deletion is enabled.
- Public repository encoding and cross-version compatibility are not yet a
  stable third-party contract.

### Storage and integrity

- FastCDC chunking and BLAKE3 content IDs.
- Streaming FastCDC ingest for large binary files (peak buffers track the
  chunker `max_size`, not the whole file).
- Source size/mtime mutation checks around ingest; mid-write changes fail closed.
- Atomic index publication via temp file + rename.
- Deduplication of byte-identical chunks.
- Digest verification on object read and byte-exact reconstruction tests.
- Read-only `fsck` verification of commit/manifest identity, ref targets,
  manifest-referenced chunks, Git blobs and MP4 structural blobs, chunk layout,
  and regular-entry aggregate size/content identity.
- Repository, file, and cache inspection commands.
- Local lifecycle (`freeze`/`thaw`), metadata, dependency, ignore, and audit
  facilities.

Named limitations:

- Text and MP4-specialized ingest paths may still buffer whole files; the
  streaming path covers classified large binary files at or above 1 MiB.
- Loose object storage is not appropriate for very high object counts until
  packfiles and indexes are implemented.
- Exact format support is bounded by the current corpus; no universal
  MP4/MOV/media support claim is valid.

### Media

- MP4/ISOBMFF inspection and selected parse/deconstruct/reconstruct workflows.
- Local segmentation/assembly, proxy generation, clip tracking, and metadata
  inspection.
- Experimental FACR video and photo commands using FFmpeg, including trim and
  selected EDL/OTIO demonstrations.

FACR is Experimental. It does not replace imported masters, define a universal
decoded-frame identity, or make external re-encodes byte-deduplicable.

### Local security and locks

- Local binary locks.
- Local audit log inspection/export.

The early repository-encryption experiment is disabled. `encrypt-init`,
`login`, and `change-password` fail without changing a keystore;
`encrypt-status` reports legacy state, and `logout` can clear a legacy key
cache. A repository containing the experimental keystore fails closed before
normal repository operations because the experiment did not encrypt the
embedded Git store or every metadata path.

Convergent/message-locked encryption leaks content equality and is not
equivalent to randomized repository-key encryption. Remote authentication,
multi-user authorization, remote lock leases, and hosted audit policy are not
Current.

## Experimental or feature-gated

- FACR video/photo identity and rendition experiments.
- `stream-demo`, including in-process QUIC delta-transfer demonstrations.
- FUSE mount/unmount behind the optional `fuser` Cargo feature; local only.
- Proxy, segmentation, and media-derivation experiments beyond their explicitly
  tested fixtures.

Experimental code must be described with its dependencies, fidelity contract,
and safe fallback.

## Design/scaffolding — not functional product

- Local-path and Internet `push`, `pull`, `fetch`, and `sync`; these commands
  return a nonzero error without changing objects, refs, or the working tree.
- Network clone. Local filesystem clone is the only current repository-copy
  workflow.
- A complete remote CAS/ref protocol and remote lock coordination.
- Remote VFS hydration and partial clone.
- P2P rendezvous, NAT traversal, and peer repository transfer. Every parsed
  `dits p2p` operation fails nonzero before creating or changing repository,
  target-directory, cache, socket, or mount state.
- Hosted DitsHub, REST APIs, webhooks, managed storage, and public SDK packages.
- Multi-tenant/cross-customer deduplication.
- Packfiles, multi-pack indexing, public bundle format, and independent readers.
- Full semantic edit/rendition/provenance graph.

The embedded per-repository HTTP object server and tested QUIC demo are real
utilities, but they do not implement complete repository exchange or safe remote
ref transactions.

Security warning: `dits serve` binds to all network interfaces and has no
authentication or authorization. It exposes repository refs and stored object bytes.
Use it only on a trusted or isolated network behind a firewall; do not expose it to
the public Internet.

## Installation status

Available:

- `npm install -g @byronwade/dits` and equivalent bun/pnpm global install for
  the binaries actually present in the artifact; published v0.1.5 contains
  `darwin-arm64` and `win32-x64` only. The release workflow builds the full
  platform matrix (including Linux glibc/musl) and
  `packages/npm/scripts/verify-binaries.js` refuses incomplete packages on
  future publishes;
- build from source.

Not available:

- `cargo install dits` from crates.io;
- a published Homebrew tap;
- a `curl | sh` installer;
- an official Docker image or deployable server distribution;
- official Go, Python, JavaScript, or Rust SDK packages.

## Documentation rules

1. State Current, Experimental, Design, or Historical near the top of a
   capability document.
2. Do not describe network transfer, P2P, remote locks, hosted APIs, SDKs, or
   cloud tiers as usable today.
3. Do not treat a demo transport as complete repository semantics.
4. Do not treat perceptual similarity as exact identity.
5. Distinguish measured, modeled, projected, and example figures.
6. Link performance claims to raw machine-readable evidence and a commit.
7. Keep originals, decoded identities, and encoded renditions distinct.
8. Update implementation, tests, this file, the roadmap, and public website in
   that order.

## Verification commands

```bash
cargo test --locked --workspace
bash scripts/check-cli-docs.sh
npm --workspace apps/web run test:ci
npm --workspace apps/web run build
```

The checked-in benchmark evidence is `benchmarks/latest.json` (component plus
bounded local repository timings) and, for comparative store-growth charts,
`benchmarks/comparative/latest.json` (showcase profile). Linux CI comparative
matrix refreshes are recorded at `benchmarks/comparative/ci-latest.json`
without replacing showcase cumulative/scaling series. CI test counts and
benchmark values are observations for a specific commit and machine, not
timeless product properties.
