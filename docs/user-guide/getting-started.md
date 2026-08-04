# Getting Started with Dits

**Maturity:** Current

Dits is open, local-first version control for large media and asset pipelines.
The v0.1.5 alpha provides local history and content-addressed storage. Network
repository exchange, P2P, remote hydration, and a hosted service are not
shipped. Read the [implementation status](../STATUS.md) before evaluating it.

> Use disposable or independently backed-up data. Keep original assets outside
> the repository until you have tested commit, checkout, and recovery on your
> own files. Dits is not production-ready.

## What you can evaluate

The canonical root workspace currently provides:

- local init, add, status, commit, log, diff, checkout, branch, merge, and tag
  workflows;
- FastCDC chunking and BLAKE3-addressed local objects;
- hybrid storage for text and larger binary assets;
- checksum verification and byte-exact reconstruction paths;
- local fsck and read-only garbage-collection reporting; and
- bounded, experimental media, proxy, FACR, and feature-gated VFS paths.

Remote `push`, `pull`, `fetch`, and `sync` intentionally exit nonzero without
changing repository data. Only local-filesystem clone is current.

## Install

### Published npm artifact

The published v0.1.5 npm artifact contains native binaries for exactly:

| OS | Architecture | Target |
| --- | --- | --- |
| macOS | Apple silicon | `darwin-arm64` |
| Windows | x64 | `win32-x64` |

On one of those targets, with Node.js 16 or later:

```bash
npm install -g @byronwade/dits
dits --version
```

Linux, Intel macOS, and Windows arm64 do not have a binary in the published
v0.1.5 package. There is no crates.io package, Homebrew tap, or shell installer.

### Build the source

Install a stable Rust toolchain, then build the root workspace:

```bash
git clone https://github.com/byronwade/dits.git
cd dits
cargo build --locked --release -p dits
./target/release/dits --version
```

FFmpeg is required only for commands that explicitly invoke media transforms.
The optional local FUSE mount requires a build with `--features fuser` and the
platform FUSE development package. Neither is required for the basic workflow.

## Create a safe evaluation repository

```bash
mkdir dits-evaluation
cd dits-evaluation

dits init
printf 'first version\n' > notes.txt
dits add notes.txt
dits status
dits commit -m "Add evaluation notes"
dits log
```

The `.dits` directory contains repository metadata and local object storage.
Do not edit it by hand.

## Record and inspect a change

```bash
printf 'second version\n' >> notes.txt
dits diff
dits add notes.txt
dits status
dits commit -m "Update evaluation notes"
```

`dits add` stages the exact current file state. Adding a tracked path after it
has been removed stages a deletion. Re-adding the same deletion is a safe no-op.
An unchanged or fully reverted snapshot does not create a commit.

## Restore and verify

For an evaluation copy, save the expected digest before restoring:

```bash
# macOS
shasum -a 256 notes.txt

# Linux
sha256sum notes.txt

dits checkout HEAD
```

Compare the restored file and digest with an independent copy. Checkout rejects
repository-relative path traversal and preflights target paths before changing
the working tree, but alpha users should still keep a backup.

## Branches and tags

```bash
dits branch experiment
dits switch experiment
printf 'branch work\n' >> notes.txt
dits add notes.txt
dits commit -m "Try branch workflow"
dits tag evaluation-1
```

Use [`dits --help`](cli-reference.md) for the command surface. Some advanced
commands are experimental or incomplete; a help entry alone is not a maturity
guarantee.

## Copying and sharing

A fresh local-filesystem clone is the current repository-copy workflow:

```bash
cd ..
dits clone ./dits-evaluation ./dits-evaluation-copy
```

This copies the Dits objects and embedded Git data needed by the selected local
branch. It is not a substitute for an independent backup. Network URLs are not
supported by clone, and configured remotes do not transfer repository data.

The embedded `dits serve` object server and `dits fetch-objects` are low-level
utilities, not complete remote version control. `dits serve` is unauthenticated
and defaults to loopback; use non-loopback binds only on a trusted or isolated
network and never expose the server directly to the public Internet.

## Important limitations

- Repository formats are pre-1.0 and not a stable third-party contract.
- Destructive GC is disabled; `dits gc --dry-run` only reports candidates.
- The incomplete encryption experiment is disabled. Repositories containing
  its legacy keystore fail closed.
- Large classified binaries (≥1 MiB) use streaming FastCDC ingest so peak
  buffers track the chunker `max_size`; text and MP4-specialized paths may still
  buffer whole files. Loose-object storage is not ready for very high object
  counts until packfiles exist.
- Media compatibility is bounded by tested fixtures; no universal format,
  keyframe, or storage-savings claim is valid.
- Remote transfer, remote locks, P2P, hosted APIs, and public SDKs are roadmap.

## Next steps

- [Current implementation status](../STATUS.md)
- [CLI reference](cli-reference.md)
- [Core concepts](../concepts.md)
- [Repository compatibility policy](../adr/0003-pre-1.0-repository-compatibility.md)
- [Contributing](../development/contributing.md)
