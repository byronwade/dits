# Changelog

**Maturity:** Historical planning record with current-alpha corrections

This file was started as a release-plan draft, and older entries are not proof
that a capability shipped. The authoritative current product boundary is
[`docs/STATUS.md`](docs/STATUS.md); command syntax comes from `dits --help`.
In particular, a design, demo, test, or feature-gated module must not be read as
general product support.

Notable verified changes should be documented here for future releases.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Current alpha corrections

- Local `push`, `pull`, `fetch`, and `sync` fail nonzero without changing
  objects, refs, or the working tree. Network clone is not implemented.
- The QUIC path is an in-process experimental demonstration, not a complete
  repository transport or remote-ref protocol.
- FUSE mount/unmount is experimental, local-only, and available only in source
  builds with the optional `fuser` feature.
- The early repository-encryption experiment is disabled. It did not protect
  the embedded Git store or every metadata path, and legacy-keystore
  repositories fail closed.
- Destructive garbage collection is disabled; `dits gc --dry-run` only reports
  candidates.
- Test counts are commit-specific observations and are not maintained as a
  release capability claim.

### Current local foundations

- FastCDC content-defined chunking and BLAKE3 content identifiers.
- Local Git-shaped commits, branches, tags, history editing, and checkout.
- Local-filesystem clone.
- MP4/ISOBMFF inspection and selected tested reconstruction paths.
- Web documentation and a local browser playground.

## [0.1.0] - Historical draft (release date not verified)

The original list below was a planning snapshot. It has been corrected to avoid
presenting planned or experimental work as a shipped 0.1.0 contract.

### Added
- **Core Chunking Engine**: FastCDC content-defined chunking with configurable parameters
- **Content Addressing**: BLAKE3 hashing with 32-byte identifiers for immutable objects
- **Repository Structure**: Git-inspired .dits directory with objects, refs, and index
- **Basic Commands**: init, add, commit, status, log, show
- **Virtual Filesystem Experiment**: Local FUSE mount behind the optional `fuser` feature; not packaged as general platform support
- **MP4 Processing**: Selected atom-aware parsing and reconstruction paths, bounded by the tested corpus
- **Transport Design**: Historical HTTP/QUIC research only; no working repository remote shipped
- **Configuration System**: Repository and global configuration management
- **Documentation**: Comprehensive technical documentation and architecture guides

### Technical Details
- **Chunking**: Current defaults are 16KB minimum, 64KB target, and 256KB maximum
- **Hashing**: BLAKE3 with parallel SIMD acceleration
- **Storage**: Local loose Dits objects plus an embedded Git object database; packfiles and destructive GC are not implemented
- **Repository format**: Pre-1.0 internal encoding, not a stable Git-compatible or third-party interoperability contract
- **Testing**: Test coverage exists, but totals vary by commit and environment

---

## Types of Changes

- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities

## Versioning Policy

Dits follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

## Release Cadence

There is no guaranteed release cadence, security-fix window, or annual major
release commitment during the alpha. Releases and maintainer support are best
effort.

## Pre-release Versions

The current project is alpha: behavior and repository encoding may change, and
no `beta` or `rc` stability policy has been adopted. Any future pre-release
labels must define their compatibility and support meaning at that time.

## Support Policy

There is no versioned support or security-fix commitment during the alpha.
Maintainer work is best effort; see [`SECURITY.md`](SECURITY.md) for the current
private-reporting path and limitations.

## Migration Guide

Breaking persistent-format changes require an ADR and explicit compatibility
decision. A migration tool or guide must not be promised until it exists and is
tested against retained fixtures.

