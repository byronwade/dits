# Dits — Authoritative Implementation Status

*Single source of truth for what the code actually does. Generated from `dits --help` and
verified against `apps/cli/src`. Every other doc must match this file. Last verified: 2026-06-12.*

## Canonical product

The product is the **local-first CLI at `apps/cli`** (binary `dits`, **469 passing tests**
across the workspace; version **0.1.5**, published on npm as `@byronwade/dits`).
A former backend crate workspace (`dits-api`, `dits-worker`, `dits-db`, `dits-storage`,
`dits-protocol`, `dits-sdk`, `dits-core`, `dits-chunker`, `dits-cache`, `dits-signal`) was
**quarantined to `legacy/backend-crates`** and is **not current architecture**. Do not
document those crates as live.

## What works today (local)

- **Core VCS:** `init`, `add`, `status`, `commit`, `log`, `checkout`, `branch`, `switch`,
  `diff`, `tag`, `merge`, `show`, `reflog`, `bisect`, `rebase`, `cherry-pick`, `reset`,
  `restore`*, `config`, `stash`, `grep`, `blame`, `describe`, `shortlog`, `worktree`,
  `sparse-checkout`, `hooks`, `archive`, `maintenance`, `completions`, `clean`, `gc`*, `fsck`.
- **Media / MP4:** `inspect`, `roundtrip`, `segment`, `assemble`, `proxy-generate`,
  `proxy-status`, `proxy-list`, `proxy-delete`, `video-init`, `video-add-clip`, `video-show`,
  `video-list`, `meta-scan`, `meta-show`, `meta-list`.
- **FACR frame engine (real, requires FFmpeg):** `facr-add`, `facr-checkout`, `facr-trim`,
  `facr-demo` (video); `photo-add`, `photo-edit`, `photo-render` (photos).
- **Introspection:** `inspect-file`, `repo-stats`, `cache-stats`.
- **Locking & security (local):** `lock`, `unlock`, `locks`, `encrypt-init`, `encrypt-status`,
  `login`, `logout`, `change-password`, `audit`, `audit-stats`, `audit-export`.
- **Lifecycle:** `freeze-init`, `freeze-status`, `freeze`, `thaw`, `freeze-policy`.
- **Dependency graph:** `dep-check`, `dep-graph`, `dep-list`.

\* `restore` does not yet do full merge-conflict resolution; `gc` does not yet repack.

## Roadmap — NOT implemented (do not document as working)

- **Networked sync (Phase 4b):** `push`, `pull`, `fetch`, `sync` print placeholders and do
  not transfer data over a network. `clone` only works against a **local filesystem path**,
  not a network remote. `remote` manages config only.
- **P2P (Wormhole):** `p2p` and all subcommands (share/connect/cache/ping/mount) are
  scaffolding — no data transfer, no NAT traversal, no QUIC sync.
- **Networked delta sync over QUIC:** the `push`/`pull` porcelain does **not** use QUIC and
  transfers no data over a network. (See "Implemented but not wired in" — the QUIC delta
  engine itself exists and is tested, just not connected to push/pull.)
- **Hosted service / Ditshub / REST API / official SDKs / SaaS pricing:** do not exist. The
  only server in-tree is the embedded per-repo object server (`serve`); there is no hosted
  API, no published SDK packages (`@dits/sdk`, `dits-sdk`), and no managed cloud.

## Implemented, but feature-gated or not wired into the porcelain (don't omit these)

- **`serve` (embedded remote server):** real axum/TCP server that serves object bytes from a
  repo (`store/remote_server.rs`, wired at `main.rs`). It works; it is not "scaffolding only".
- **QUIC delta engine:** `stream/quic_origin.rs` is a real, tested QUIC implementation
  (`push_delta` sends only missing segments). It is exposed via `stream-demo` but is **not**
  wired into the `push`/`pull` commands.
- **FUSE/VFS mount (`dits mount` / `dits unmount`):** fully implemented (`vfs/fuse.rs`) but
  **gated behind the `fuser` Cargo feature** — absent from a default build. Local-only;
  remote/on-demand hydration is roadmap. There is **no `dits vfs` command**.

## Documentation rules (apply everywhere)

1. Never present `push`/`pull`/`fetch`/`sync`/`clone`(network)/`p2p`/QUIC as working — label
   them **roadmap / scaffolding**.
2. Never describe the quarantined `dits-*` backend crates as current architecture. The
   architecture is the modules under `apps/cli/src/` (`core`, `store`, `mp4`, `facr`,
   `segment`, `proxy`, `vfs`, `security`, `metadata`, `dependency`, `lifecycle`, `p2p`,
   `commands`).
3. Document FACR/photo where media versioning is discussed.
4. Tests: **469 passing** across the workspace (`cargo test --workspace`). The historical
   "~123"/"120+" figures are stale undercounts — do not repeat them.
5. Version is **0.1.5** everywhere (Cargo workspace, `@byronwade/dits` on npm, download page,
   docs). Do not use `1.0.0`, `0.1.2`, `0.1.0`, or `0.1.4`.
6. License is **Apache-2.0 OR MIT** (dual). Never describe it as MIT-only.
7. Install that works: `npm install -g @byronwade/dits` (+ bun/pnpm) or build from source.
   `cargo install dits`, Homebrew taps, and the SDK packages are **not published** — label
   them planned, not working.
