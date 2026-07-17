# Compatibility

**Maturity:** Current

This is the compatibility status of the current alpha, not a support guarantee.

**Last reviewed:** 2026-07-16

Dits v0.1.5 is pre-1.0 evaluation software. This page distinguishes packaged
targets from source-build possibilities and tested paths from broad format
support. Keep independent backups and verify restored files.

## Published npm package

The published `@byronwade/dits` v0.1.5 artifact contains exactly these native
binaries:

| Operating system | Architecture | Package target |
| --- | --- | --- |
| macOS | Apple silicon | `darwin-arm64` |
| Windows | x64 | `win32-x64` |

Install the package with:

```bash
npm install -g @byronwade/dits
dits --version
```

Linux, Intel macOS, and Windows ARM64 require a source build for v0.1.5. A target
appearing in CI or a release workflow does not mean its binary is present in the
published package. There is no published crates.io package, Homebrew tap, shell
installer, official container image, or server distribution.

For package details, see the [`npm package README`](../../packages/npm/README.md).

## Source builds

A Rust toolchain can build the current workspace from source:

```bash
git clone https://github.com/byronwade/dits.git
cd dits
cargo build --release -p dits
./target/release/dits --version
```

Source buildability on a machine is not a promise of a supported binary, OS
version, installer, or long-term compatibility. The optional FUSE mount path is
local-only, requires the `fuser` Cargo feature and an OS FUSE installation, and
should be treated as experimental.

## Files and media

- General files use content-defined chunking and BLAKE3-addressed local storage.
  Only byte-identical chunks deduplicate; no space-saving percentage is promised.
- MP4/ISOBMFF support covers selected, tested parse, deconstruct, and reconstruct
  paths. It is not universal MP4 or MOV compatibility.
- FACR video/photo, proxy, segmentation, and related FFmpeg-backed paths are
  experimental. Imported masters remain the source of truth.
- Dits does not claim full semantic support for MXF, AVI, MKV, WebM, camera RAW,
  NLE project formats, or editor plug-ins.

Compatibility is bounded by the checked-in test corpus and the exact command path
being evaluated. A file extension or codec name alone is not evidence that every
variant round-trips correctly.

## Repository and network compatibility

The pre-1.0 repository encoding is not a stable public contract for third-party
readers or cross-version interoperability. Use the same reviewed build for an
evaluation and retain the original source files.

Local-filesystem clone is the only current repository-copy workflow. `push`,
`pull`, `fetch`, and `sync` return a nonzero error for both local-path and Internet
remotes without changing objects, refs, or the working tree. There are no current
public SDK packages, hosted APIs, P2P transfer, remote VFS hydration, or network
clone compatibility promises.

## Verification policy

Before describing a platform or format as compatible:

1. Record the exact Dits version or commit, OS, architecture, filesystem, and
   external-tool versions.
2. Test representative fixtures, including malformed and boundary cases.
3. Compare restored output with an independent byte hash.
4. Report measured results with their fixture and environment; do not generalize
   them into universal support.

Use [`../STATUS.md`](../STATUS.md) as the implementation authority, the
[`getting-started guide`](../user-guide/getting-started.md) for a disposable local
evaluation, and the [`benchmark policy`](../performance/benchmarks.md) when
publishing performance observations.
