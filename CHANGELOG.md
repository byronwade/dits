# Changelog

All notable changes to Dits will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial public release of Dits
- Content-defined chunking with FastCDC algorithm
- BLAKE3 cryptographic hashing for content addressing
- Virtual filesystem with FUSE support
- Git-like command interface (add, commit, log, diff, etc.)
- MP4/ISOBMFF structure-aware processing
- QUIC-based transport for high-performance transfers
- Repository encryption with optional client-side keys
- Comprehensive test suite with 120+ automated tests
- Web-based documentation and interface

### Changed
- N/A (initial release)

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

## [0.1.0] - 2024-12-XX

### Added
- **Core Chunking Engine**: FastCDC content-defined chunking with configurable parameters
- **Content Addressing**: BLAKE3 hashing with 32-byte identifiers for immutable objects
- **Repository Structure**: Git-inspired .dits directory with objects, refs, and index
- **Basic Commands**: init, add, commit, status, log, show
- **Virtual Filesystem**: FUSE-based mount for on-demand file access
- **MP4 Processing**: Atom-aware parsing with metadata preservation
- **Basic Transport**: HTTP-based file transfer with resumable uploads
- **Configuration System**: Repository and global configuration management
- **Documentation**: Comprehensive technical documentation and architecture guides

### Technical Details
- **Chunking**: Min 32KB, average 64KB, max 256KB chunks
- **Hashing**: BLAKE3 with parallel SIMD acceleration
- **Storage**: Flat object store with reference counting
- **Index**: Git-compatible index format with extension support
- **Testing**: 120+ test cases covering core functionality

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

- **Patch releases**: As needed for bug fixes and security updates
- **Minor releases**: Every 4-6 weeks for new features
- **Major releases**: Annually or when breaking changes are necessary

## Pre-release Versions

Pre-release versions use the following suffixes:
- `alpha`: Early testing, API may change
- `beta`: Feature complete, API stable
- `rc`: Release candidate, ready for production

Example: `1.2.3-alpha.1`, `1.2.3-beta.2`, `1.2.3-rc.1`

## Support Policy

- Current major version receives active support
- Previous major version receives security updates only
- Versions older than 1 year receive no updates

## Migration Guide

For breaking changes, migration guides will be provided in the documentation.



