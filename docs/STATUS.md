# Dits — Authoritative Implementation Status

*Single source of truth for what the code actually does. Generated from `dits --help` and
verified against `apps/cli/src`. Every other doc must match this file. Last verified: 2026-06-02.*

## Canonical product

The product is the **local-first CLI at `apps/cli`** (binary `dits`, ~123 passing tests).
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
  not transfer data. `clone` only works against a **local filesystem path**, not a network
  remote. `remote`/`serve` manage config/scaffolding only.
- **P2P (Wormhole):** `p2p` and all subcommands (share/connect/cache/ping/mount) are
  scaffolding — no data transfer, no NAT traversal, no QUIC sync.
- **QUIC delta transport:** designed, not implemented.

## Documentation rules (apply everywhere)

1. Never present `push`/`pull`/`fetch`/`sync`/`clone`(network)/`p2p`/QUIC as working — label
   them **roadmap / scaffolding**.
2. Never describe the quarantined `dits-*` backend crates as current architecture. The
   architecture is the modules under `apps/cli/src/` (`core`, `store`, `mp4`, `facr`,
   `segment`, `proxy`, `vfs`, `security`, `metadata`, `dependency`, `lifecycle`, `p2p`,
   `commands`).
3. Document FACR/photo where media versioning is discussed.
4. Tests: ~123 in the canonical engine (the historical "120+" claim is true).
