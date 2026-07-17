# Hybrid Text Storage

**Maturity:** Current

This page describes the local implementation in this repository. Storage formats,
classification rules, and internal fields remain pre-1.0 and may change.

## What is implemented

`dits add` classifies each regular file before storing it:

- Known text extensions and text-like unknown content use the embedded Git object store.
- Binary formats use Dits content-defined chunks and BLAKE3 content hashes.
- MP4 files use the structure-aware local path described in [Local storage](./local-storage.md).
- A small set of NLE project extensions classify as `Hybrid`, but the add path currently
  stores those files as binary. Metadata/payload splitting is not implemented.

The index and commit manifest record the chosen strategy plus either a Git blob OID,
chunk references, or MP4 metadata. This is an implementation detail, not a stable public
wire format.

## Classification boundary

Classification is automatic. The implementation checks known extensions and filenames,
then uses a bounded content heuristic for otherwise unknown files. Unknown content that
cannot be identified safely falls back to binary chunk storage.

`.ditsattributes` is recognized as a text filename, but its contents are not currently
parsed as storage overrides. Earlier drafts that documented `storage=git`,
`hybrid_storage`, `default_text_strategy`, or related configuration keys were design
proposals, not supported configuration.

Use [Configuration reference](../user-guide/config-reference.md) for the complete public
configuration surface.

## User-visible limits

- Text storage enables the local text-aware paths that are implemented by the CLI; it
  does not imply Git command or repository-format compatibility.
- Hybrid NLE parsing and metadata/payload separation remain design work.
- Remote transfer, hosted collaboration, and a public storage protocol are not part of
  this local storage behavior.
- Do not edit `.dits` internals manually; use CLI commands and keep backups of important
  source material while the format is pre-1.0.

See [Active architecture](./active-architecture.md), [How Dits works](../concepts/how-dits-works.md),
and [Documentation status](../STATUS.md) for the supported boundary.
