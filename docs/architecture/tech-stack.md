# Active Technology Stack

**Maturity:** Current

The active workspace is Rust. The local engine uses Clap for the CLI, FastCDC for
content-defined chunking, BLAKE3 for exact content IDs, Serde/JSON/TOML for current
internal encodings, libgit2 for the embedded text engine, and selected MP4/FFmpeg paths
for media experiments.

Optional FUSE support uses `fuser`. QUIC, P2P, proxy, FACR, segmentation, and other media
dependencies support bounded experiments; their presence in the dependency graph does
not make a complete remote protocol or universal media workflow Current.

There is no active hosted database, server control plane, Windows Dokany VFS, Tauri
desktop client, or managed object-storage tier. See [`../STATUS.md`](../STATUS.md) and
[`active-architecture.md`](active-architecture.md) for the governing boundary.
