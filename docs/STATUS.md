# Dits Implementation Status

**Maturity:** Current implementation authority

**Product version:** 0.1.5

**Last repository review:** 2026-07-16

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
  checkout, hooks, archive, maintenance, completions, clean, GC, and fsck.
- Hybrid storage routes supported text workflows through libgit2 and large
  binary content through Dits manifests/chunks.
- Local filesystem clone/object transfer and local-path push behavior.

Named limitations:

- `restore` does not provide complete merge-conflict resolution.
- GC sweeps reachable/unreachable loose objects but does not yet provide the
  planned pack/repack system.
- Public repository encoding and cross-version compatibility are not yet a
  stable third-party contract.

### Storage and integrity

- FastCDC chunking and BLAKE3 content IDs.
- Deduplication of byte-identical chunks.
- Digest verification on object read and byte-exact reconstruction tests.
- Repository, file, and cache inspection commands.
- Local lifecycle (`freeze`/`thaw`), metadata, dependency, ignore, and audit
  facilities.

Named limitations:

- Large-file ingest is not yet bounded by the target memory formula; the
  current path can hold file-sized and copied buffers.
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
- Local encryption initialization/status and keystore-oriented login/logout.
- Local audit log inspection/export.

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

- Internet `push`, `pull`, `fetch`, `sync`, and network clone.
- A complete remote CAS/ref protocol and remote lock coordination.
- Remote VFS hydration and partial clone.
- P2P rendezvous, NAT traversal, and peer repository transfer.
- Hosted DitsHub, REST APIs, webhooks, managed storage, and public SDK packages.
- Multi-tenant/cross-customer deduplication.
- Packfiles, multi-pack indexing, public bundle format, and independent readers.
- Full semantic edit/rendition/provenance graph.

The embedded per-repository HTTP object server and tested QUIC demo are real
utilities, but they do not implement complete repository exchange or safe remote
ref transactions.

## Installation status

Available:

- `npm install -g @byronwade/dits` and equivalent bun/pnpm global install;
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
cargo test --workspace
bash scripts/check-cli-docs.sh
npm --workspace apps/web run test:ci
npm --workspace apps/web run build
```

The checked-in benchmark evidence is `benchmarks/latest.json`. CI test counts
and benchmark values are observations for a specific commit, not timeless
product properties.
