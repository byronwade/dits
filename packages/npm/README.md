# @byronwade/dits

**Open, local-first version control for large media and asset pipelines.**

[![npm version](https://img.shields.io/npm/v/@byronwade/dits.svg)](https://www.npmjs.com/package/@byronwade/dits)
[![License](https://img.shields.io/npm/l/@byronwade/dits.svg)](LICENSE)

> Dits v0.1.5 is alpha software. Evaluate it only on disposable or independently
> backed-up projects, and verify restored files. Network transfer, P2P, and a
> hosted service are not shipped.

## Install

```bash
npm install -g @byronwade/dits
dits --version
```

The launcher selects the packaged binary for the current platform. Node.js 16
or later is required.

## Start a local evaluation

```bash
mkdir dits-evaluation
cd dits-evaluation

dits init
dits add .
dits commit -m "First exact snapshot"
dits status
dits log
```

## What the alpha includes

- Git-shaped local commits, branches, tags, merges, diffs, and checkout.
- FastCDC content-defined chunking and BLAKE3-addressed local storage.
- Hybrid paths for text and large binary assets.
- Byte-exact local reconstruction and integrity-oriented reads.
- MP4-aware code and experimental FACR, photo, proxy, and VFS paths.

## What it does not include

Network `push`, `pull`, `fetch`, `sync`, network clone, P2P, QUIC transfer, a
hosted Dits service, supported SDKs, and NLE plug-ins are roadmap. Placeholder
commands do not transfer repository data.

## Other package managers

The same npm package can be installed with:

```bash
bun install -g @byronwade/dits
pnpm install -g @byronwade/dits
yarn global add @byronwade/dits
```

There is no published shell installer, Homebrew tap, or crates.io package. To
build the repository source directly:

```bash
git clone https://github.com/byronwade/dits.git
cd dits
cargo build --release -p dits
./target/release/dits --version
```

## Platforms

The npm package contains launch paths for macOS, Linux, and Windows on supported
x64 and arm64 variants. Packaging presence is not a guarantee that every
filesystem, media format, or experimental feature has been validated on every
combination; please report exact platform details with failures.

## Learn and contribute

- [Documentation](https://dits.dev/docs)
- [Current status](https://github.com/byronwade/dits/blob/main/docs/STATUS.md)
- [Roadmap](https://github.com/byronwade/dits/blob/main/ROADMAP.md)
- [Issue tracker](https://github.com/byronwade/dits/issues)

Dits is dual-licensed under Apache-2.0 OR MIT.
