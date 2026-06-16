# Dits Roadmap

> **Source of truth:** [`docs/STATUS.md`](docs/STATUS.md) is the authoritative record of what
> the code actually does today. This roadmap describes **what is *not* finished yet**, organized
> by importance, plus the longer-term direction. If anything here disagrees with `docs/STATUS.md`,
> `docs/STATUS.md` wins.
>
> **Where this is mirrored:** the public site renders the same picture at
> [`/docs/roadmap`](apps/web/src/app/docs/roadmap/page.tsx); the phased engineering plan lives in
> [`docs/roadmap/phases.md`](docs/roadmap/phases.md). All three are kept in sync.

Dits is **alpha (v0.1.5)**. The local-first engine and CLI work today. Networked sync, P2P, and
any hosted service are **roadmap, not shipped**. This document is deliberately honest about the gap
so contributors and evaluators know exactly where the edges are.

---

## Status legend

| Mark | Meaning |
|------|---------|
| ✅ | Works today (local) |
| 🟡 | Partially implemented (works, but with a named limitation) |
| 🧪 | Implemented but experimental and/or behind a feature flag |
| ⏳ | Roadmap — designed/scaffolded but **does not function** yet |
| 💤 | Not started |

---

## What works today (so the gap is clear)

These run locally, offline, on your own disk (see `docs/STATUS.md` for the exact command list):

- ✅ Content-addressed chunk store: FastCDC chunking, dedup, BLAKE3 verification, byte-exact reconstruction
- ✅ Git-like local workflow: `init`/`add`/`status`/`commit`/`log`/`checkout`/`branch`/`switch`/`diff`/`tag`/`merge`/`show`/`reflog`/`rebase`/`cherry-pick`/`reset`/`stash`/`bisect`/`blame`/`grep`/`describe`/`shortlog`/`worktree`/`sparse-checkout`/`hooks`/`archive`/`maintenance`/`completions`/`clean`/`fsck`
- ✅ Media/MP4: structure-aware ISOBMFF parse → deconstruct → reconstruct, `segment`/`assemble`, proxy generation, video clip tracking, metadata scan/show
- 🧪 FACR frame engine (needs FFmpeg): `facr-add`/`facr-checkout`/`facr-trim`/`facr-demo`, `photo-add`/`photo-edit`/`photo-render`
- ✅ Local locks & security: `lock`/`unlock`/`locks`, convergent encryption (`encrypt-init`), `login`/`logout`, audit log
- ✅ Introspection: `repo-stats`/`inspect-file`/`cache-stats`
- ✅ Local clone/push against a filesystem path; `serve` (embedded per-repo object server over TCP)

---

## Full audit of what is NOT completed (by importance)

Everything below is unfinished. Tiers are ordered by impact on credibility and usefulness.

### Tier 0 — Launch blockers / honesty-critical

These either don't work despite looking like they should, or block someone from trying Dits.

- [ ] ⏳ **Networked sync** — `push`/`pull`/`fetch`/`sync` over a network only print placeholders and transfer **no data**. *(STATUS: Phase 4b)*
- [ ] ⏳ **Network `clone`** — `clone` works only against a **local filesystem path**, not a URL/remote.
- [ ] ⏳ **Wire the QUIC delta engine into the porcelain** — a real, tested QUIC delta engine exists (`stream/quic_origin.rs`, exposed via `dits stream-demo`) but is **not connected** to `push`/`pull`. Connecting it is the single highest-leverage networking task.
- [ ] ⏳ **P2P (Wormhole)** — `p2p` and all subcommands are scaffolding: no NAT traversal, no data transfer.
- [ ] 💤 **Install paths that don't exist yet** — no `curl … install.sh | sh`, no `cargo install dits` (not on crates.io), no Homebrew tap. Only npm/bun/pnpm, GitHub Releases, source, and Docker work.
- [ ] 🟡 **Prebuilt-binary platform coverage** — the npm package targets darwin/linux/win32 × x64/arm64, but releases may not yet ship a binary for every combination (`npm i -g` then prints `Binary not found for your platform`). Verify/automate full matrix in CI releases.
- [ ] ⏳ **Public docs/site Vercel deployment** — the Next.js site in `apps/web` is not yet continuously deployed; several pages still describe roadmap features as if shipped (see Tier 4 site-audit items).

### Tier 1 — Core product completeness

Local features that exist but are not finished, or are required before networked use is credible.

- [ ] 🟡 **`restore`** — does not yet do full merge-conflict resolution.
- [ ] 🟡 **`gc`** — reference-counted sweep works, but does **not** repack/compact objects yet.
- [ ] 🧪 **FUSE/VFS mount (`dits mount`/`unmount`)** — fully implemented but **gated behind the `fuser` Cargo feature** (absent from a default build) and **local-only**. Ungate for default builds where the platform supports it.
- [ ] ⏳ **Remote on-demand hydration for VFS** — the mount cannot pull missing chunks from a remote (depends on networked sync).
- [ ] ⏳ **Migration from Git LFS** — no importer yet; data models differ (LFS pointers vs. chunk manifests), so migration requires re-chunking.
- [ ] 🟡 **Reflog deletion tracking** — `reflog` exists; tracking recovery of deleted commits/branches end-to-end is not complete.
- [ ] 🧪 **FACR → stable** — frame-addressable video is experimental and FFmpeg-dependent; needs hardening, broader codec coverage, and docs before it's a headline feature.

### Tier 2 — Media / advanced workflows

- [ ] ⏳ **Proxy / "Hologram" remote workflow** — local proxy generation works; `checkout --proxy` against server-side originals (fetch full-res on demand) depends on networking.
- [ ] ⏳ **Tiered storage cloud backends (Deep Freeze)** — local `freeze`/`thaw`/`freeze-policy` exist; S3/Glacier cold tiers and automated lifecycle to the cloud are roadmap.
- [ ] 🟡 **Convergent encryption hardening** — `encrypt-init` exists locally; key rotation/revocation, RBAC-managed keys, and multi-tenant key management are not done.
- [ ] 💤 **Video timeline diff/merge** — semantic diff/merge of NLE project files (Premiere XML, DaVinci Resolve `.drp`, Final Cut) is unimplemented.
- [ ] 💤 **Additional container formats** — native handling for MXF, MKV, and others beyond MP4/MOV.
- [ ] 💤 **VFR / multi-track / HDR keyframe alignment refinements** — variable-frame-rate spacing, cross-track boundary alignment, and HDR/Dolby Vision metadata preservation are open.

### Tier 3 — Ecosystem & hosted layer

- [ ] ⏳ **Hosted sync service ("DitsHub")** — a future, optional hosted layer over the *same open protocol*, primarily for networked sync. Not built; no SaaS, no marketplace, no pricing.
- [ ] ⏳ **REST API + webhooks** — documented as design intent only; no server implements them today.
- [ ] 💤 **Official SDKs** (Go / Python / JavaScript / Rust) — not published; do not exist as packages.
- [ ] 💤 **GUI application** (Tauri) and **mobile** support.
- [ ] 💤 **IDE / creative-tool integrations** — VS Code, JetBrains, Unreal Engine, Unity, Premiere Pro, DaVinci Resolve plugins.
- [ ] 💤 **Cross-repository deduplication** — shared chunk pool across repos (studio-scale), with security boundaries.

### Tier 4 — Site & docs accuracy (open-source launch readiness)

Concrete cleanup so public-facing material matches reality. The repo `README.md` was corrected in
this pass; the website still needs matching banners.

- [x] **README** — fixed broken `install.sh` claim, stale test counts (now 469), overstated benchmark numbers, wrong `dits-io/dits`/`docs.dits.io` links, and roadmap items shown as shipped.
- [ ] **Web docs: add "roadmap / not implemented" banners** to pages that describe unbuilt features as if live:
  - `apps/web/src/app/docs/api/{rest,wire,webhooks,sdks}/page.tsx`
  - `apps/web/src/app/docs/deployment/{cloud,kubernetes,self-hosting}/page.tsx`
  - `apps/web/src/app/docs/cli/{p2p,remotes,vfs}/page.tsx`
  - `apps/web/src/app/docs/concepts/peer-to-peer/page.tsx`
- [ ] **Web roadmap page** — replace stale "2025 quarters / CLI v1.0 / Ditshub cloud product" framing with this tiered, honest view. *(done in this pass — keep in sync going forward)*
- [ ] **Add example projects** — there is no top-level `examples/` directory; add runnable demos (game-asset repo, dataset repo, video/FACR demo) for Show HN / community testing.
- [ ] **Benchmark transparency** — clearly label networked benchmark rows as targets; keep `benchmarks/latest.json` as the only "measured" source.

### Tier 5 — Research / open problems

Hard problems without settled answers. The full list of ~40 lives under "Open Problems & Research
Questions" in [`README.md`](README.md#open-problems--research-questions): optimal chunk sizing,
petabyte-scale GC, multi-path QUIC, adaptive prefetch scheduling, CRDT-based offline merge,
zero-knowledge chunk proofs, and more. Contributions and prior art welcome.

---

## Mapping to the 9 engineering phases

The detailed phase breakdown is in [`docs/roadmap/phases.md`](docs/roadmap/phases.md).

| Phase | Name | State |
|------:|------|-------|
| 1 | The Engine | ✅ Complete (local chunking/dedup, bit-for-bit checkout) |
| 2 | Structure Awareness | ✅ Complete (MP4/ISOBMFF atom handling) |
| 3 | Virtual File System | 🧪 Implemented, feature-gated + local-only |
| 3.5 | Git Parity | ✅ Complete (local) |
| 3.6 | Hybrid Storage | ✅ Complete (Git for text, Dits for binary) |
| 4 | Collaboration & Sync | ⏳ Roadmap — **not implemented** (placeholders) |
| 5 | Conflict & Locking | 🟡 Local locks/`gc`/`fsck` ship; networked conflict handling is roadmap |
| 6 | The Hologram (proxies) | 🟡 Local proxy gen ships; remote proxy workflow is roadmap |
| 7 | Creative Ecosystem | ⏳ Roadmap (plugins, SDKs, tool integrations) |
| 8 | Deep Freeze (tiered storage) | 🟡 Local freeze/thaw ship; cloud tiers are roadmap |
| 9 | The Black Box (encryption) | 🟡 Local convergent encryption ships; RBAC/key mgmt is roadmap |

---

## How to help

Highest-leverage contributions right now:

1. **Wire the existing QUIC delta engine into `push`/`pull`** (Tier 0) — most of the hard part is built.
2. **Finish `restore` conflict resolution and `gc` repack** (Tier 1).
3. **Add runnable example repos** for game assets, AI datasets, and video/FACR (Tier 4).
4. **Add roadmap banners to the web docs pages** listed in Tier 4.

Open an issue at <https://github.com/byronwade/dits/issues> describing what you want to tackle. See
[`README.md` → Contributing](README.md#contributing) and [`CONTRIBUTORS.md`](CONTRIBUTORS.md).
