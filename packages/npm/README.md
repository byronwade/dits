# @byronwade/dits

**Open, local-first version control for large media and asset pipelines.**

[![npm version](https://img.shields.io/npm/v/@byronwade/dits.svg)](https://www.npmjs.com/package/@byronwade/dits)
[![GitHub stars](https://img.shields.io/github/stars/byronwade/dits?style=flat&logo=github)](https://github.com/byronwade/dits)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-97a927)](https://github.com/byronwade/dits#license)

> **Alpha — v0.1.5.** Evaluate Dits only on disposable or independently
> backed-up projects, and verify restored files. Network repository exchange,
> P2P, a hosted service, and official SDKs are not shipped.

Dits gives mixed code-and-media projects Git-shaped local history with chunked,
content-addressed storage. Exact local workflows work today; semantic media and
team sync are roadmap.

## Install and try it

```bash
npm install -g @byronwade/dits

mkdir dits-demo && cd dits-demo
dits init
dits add .
dits commit -m "First exact snapshot"
dits status
dits log
```

Node.js 16 or later is required. The published v0.1.5 artifact contains exactly
these packaged binaries:

| OS | Architecture | Package target |
|---|---|---|
| macOS | Apple silicon | `darwin-arm64` |
| Windows | x64 | `win32-x64` |

Linux, Intel macOS, and Windows arm64 currently require a source build for the
published v0.1.5 artifact. The release workflow already builds the full platform
matrix (including Linux glibc/musl), and
`packages/npm/scripts/verify-binaries.js` refuses incomplete future publishes.
The npm launcher selects a binary already present in the package; it does not
download one during installation.

## Why Dits exists

- **Reuse unchanged bytes:** FastCDC can reuse byte-identical BLAKE3-addressed
  chunks across local revisions instead of always copying the whole binary.
- **Keep code and assets together:** Git-backed text history and chunked binary
  manifests share one local workflow.
- **Verify reconstruction:** content digests and byte-exact tests make local
  history inspectable.
- **Explain outputs next:** the open research direction represents source,
  edits, dependencies, timelines, and renditions explicitly.

## Current alpha boundary

Current local paths include Git-shaped commits, branches, tags, merges, diffs,
checkout, integrity inspection, and hybrid text/binary storage. Selected MP4,
FACR, photo, proxy, and FUSE paths are bounded or experimental.

Network `push`, `pull`, `fetch`, `sync`, network clone, P2P, a hosted Dits
service, supported SDKs, and NLE plug-ins are roadmap. Remote commands exit
nonzero without changing objects, refs, or working-tree files.

## Other package managers and source builds

The same npm artifact can be installed with bun, pnpm, or Yarn. There is no published shell installer,
Homebrew tap, or crates.io package.

```bash
git clone https://github.com/byronwade/dits.git
cd dits
cargo build --locked --release -p dits
./target/release/dits --version
```

## Learn and contribute

- [Website and documentation](https://dits.byronwade.com)
- [Current implementation status](https://github.com/byronwade/dits/blob/main/docs/STATUS.md)
- [Safe evaluation guide](https://github.com/byronwade/dits/blob/main/docs/user-guide/getting-started.md)
- [Roadmap](https://github.com/byronwade/dits/blob/main/ROADMAP.md)
- [Contributor guide](https://github.com/byronwade/dits/blob/main/CONTRIBUTING.md)
- [Issue forms](https://github.com/byronwade/dits/issues/new/choose)

If this is a problem you want solved, [star Dits on GitHub](https://github.com/byronwade/dits)
to follow its progress and help other media-pipeline builders discover it.

Dits is dual-licensed under Apache-2.0 OR MIT.
