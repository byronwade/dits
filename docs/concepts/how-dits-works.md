# How Dits Works

**Maturity:** Current

Dits is a local-first version-control engine for mixed text and large binary assets.
This page summarizes the implemented boundary; detailed contracts live in
[Core Concepts](../concepts.md), the
[Active Architecture](../architecture/active-architecture.md), and
[Implementation Status](../STATUS.md).

## Local repository model

1. `dits init` creates a working tree with `.dits/` metadata.
2. `dits add` classifies paths. Routed text content uses the embedded Git object
   database; binary and selected media content use Dits manifests and objects.
3. Generic binary bytes are split with FastCDC. Each chunk ID is the BLAKE3 digest of
   those exact bytes.
4. A deterministic JSON manifest records canonical paths and storage-specific recipes.
5. `dits commit` records a manifest hash, parents, message, identity, and timestamp.
6. Branches and tags are local refs. Checkout verifies and reconstructs the selected
   snapshot.

Deduplication means reusing byte-identical chunks already present in the same repository.
It does not imply that two re-encodes, visually similar frames, or semantically equivalent
project files have the same content identity.

## Experimental media behavior

Selected MP4 inspection and reconstruction, segmentation, proxies, FACR video/photo
commands, and optional local VFS paths exist with fixture and dependency limits. They do
not provide universal codec/container support, decoded-frame identity, or guaranteed
semantic merge across creative tools.

## What is not a current workflow

- Network clone and complete repository transfer.
- Local-path or network `push`, `pull`, `fetch`, and `sync`; they fail
  nonzero without changing repository data.
- P2P sharing, remote locks, hosted review, accounts, public APIs, or SDKs.
- Working repository encryption; the early experiment is disabled and fails closed.
- Destructive garbage collection; only read-only candidate reporting is available.
- Remote VFS hydration, partial clone, and automatic semantic provenance graphs.

Use the [Getting Started guide](../user-guide/getting-started.md) for a current local
workflow and the [Roadmap](../../ROADMAP.md) for dependency-ordered future work.
