# Dits — Product/Marketing/Docs Drift Audit

**Date:** 2026-06-12
**Scope:** Cross-reference every product claim in the marketing pages (`apps/web`) and
documentation (`docs/`, web docs) against what the actual code (`apps/cli`, `packages/`)
does. Ground truth verified against `docs/STATUS.md` (last verified 2026-06-02) and by
direct code inspection.

---

## TL;DR

The codebase already contains its own honesty mechanism — `docs/STATUS.md` — and the
**live marketing site is mostly careful** (it carries explicit "roadmap" badges on sync and
P2P). The drift is **not in the polished surfaces**; it's concentrated in:

1. **Legacy backend content that was never purged** — the README tail, several
   `docs/operations/*` and `docs/data-structures/*` files still document a hosted
   server (`dits-server`, Postgres/Redis/S3, REST API, Kubernetes "production") that was
   **quarantined to `legacy/backend-crates`** and is explicitly *not* the current product.
2. **Aspirational marketing docs** (`docs/marketing/revolutionary-vision.md`,
   `unique-positioning.md`) that make AI-assistant, real-time-collaboration, ARR, and
   "20+ major studios" claims the live site deliberately avoids.
3. **Installation instructions** pointing to artifacts/taps/domains that don't
   demonstrably exist — and two install docs that disagree with each other.
4. **Internal contradictions** — VFS "works today" vs "not shipped", version `1.0.0` vs
   `0.1.2` vs `0.1.0`, MIT vs dual-license, two different GitHub orgs.

Root cause: a real "honesty pass" was done (STATUS.md, cli-reference.md, the live site's
roadmap badges) but it **didn't reach every file**. Only 14 docs reference STATUS.md, and
**none of the highest-risk ones do**.

---

## Ground truth (what actually ships, verified in code)

| Area | Reality | Evidence |
|---|---|---|
| Core VCS (init/add/commit/log/diff/branch/merge/rebase/bisect/etc.) | **Works**, local | `apps/cli/src/commands/core`, `branching` |
| FastCDC chunking + BLAKE3 hashing | **Works** (measured: BLAKE3 1810 MB/s, SHA-256 348 MB/s on M2 Pro) | `benchmarks/latest.json` |
| MP4/ISOBMFF parse → deconstruct → reconstruct | **Works** | `apps/cli/src/mp4` |
| FACR frame engine (FFmpeg) | **Works**, labeled experimental | `apps/cli/src/facr` |
| Local-path `clone`/`push` | **Works** against a filesystem path | `repo/push.rs:110+` |
| VFS / `mount` | **Real but gated** behind `--features fuser`; local-only; **not in default build** | `Cargo.toml:114`, `vfs/mod.rs:41` |
| Network `push`/`pull`/`fetch`/`sync` | **Stub** — prints placeholder, transfers no data | `repo/push.rs:63-64` ("…implemented in Phase 4b") |
| Network `clone` | **Not implemented** (local path only) | STATUS.md; `repo/clone.rs` |
| `remote`/`serve` | Config/scaffolding only | STATUS.md |
| P2P (share/connect/cache/ping/mount) | **Scaffolding** — prints fake success | `advanced/p2p.rs:196,238` |
| QUIC delta transport | **Designed, not implemented** | STATUS.md |
| Hosted backend / REST API / SDK / Ditshub | **Does not exist** (quarantined to `legacy/`) | `Cargo.toml` exclude; STATUS.md |

`docs/STATUS.md` is **accurate** and should remain the single source of truth.

---

## CRITICAL — claims that contradict reality with no disclaimer

### C1. `docs/data-structures/remote.md` presents network sync as shipped code
Highest-risk file. Opens with *"A Remote represents a connection to a Dits server that
hosts repositories"* and provides full Rust implementations of `connect()` (HTTP, Bearer
auth, `/api/v1/health`), `fetch()`, and `push()` (`download_objects`/`upload_objects`),
plus `url = "https://dits.io/myorg/myrepo"`. **Zero** roadmap/scaffolding language. Directly
contradicts STATUS.md rule #1.

### C2. README.md tail resurrects the quarantined backend + "Enterprise Ready"
The README has an **honest** status section (line 459 labels QUIC/P2P/push-pull as
"scaffolding that currently print placeholders") but then contradicts itself:
- **Line 1945:** `**Enterprise Ready** — Production-grade reliability` — contradicts its own
  FAQ (line 493: *"in active development… expect some rough edges"*) and the site's alpha
  banner.
- **Lines 1032-1040:** "Self-Hosting" / "Kubernetes (production)" with `dits-server`,
  Postgres/Redis/MinIO, `dits-migrate`, `dits-admin` — the quarantined backend.
- **Line 1938:** links to a "REST API and SDK references" doc set for a backend that
  doesn't exist.
- **Lines 1197-1221:** performance tables ("Chunk upload (LAN) 500+ MB/s", "(WAN)…") —
  perf numbers for sync features that aren't implemented.
- **Lines 1730-1740:** SQL schema (`status VARCHAR… WHERE status='running'`) from the
  backend worker.

### C3. `docs/operations/troubleshooting.md` and `performance-tuning.md` teach network ops as working
Both document `dits push --chunked/--direct-upload`, `dits pull <path>`, `dits clone owner/repo`,
and `time dits push --stdin` benchmarks. Their only caveat is a *"quarantined backend
service… NOT the current product"* banner — which **never states the commands transfer no
data**, so a reader reasonably treats them as working server ops.

### C4. Installation instructions reference artifacts that don't demonstrably exist — and disagree
Every install path is presented as working with no caveat, and the two primary install docs
**contradict each other**:
- `docs/user-guide/getting-started.md`: tap `dits-io/dits`, domain `dits.io`
  (`curl … dits.io/install.sh`, `apt … dits.io/apt`), `dits 1.0.0`.
- `docs/workflows/first-time-setup.md`: tap `dits/dits`, domain `dits.dev`
  (`get.dits.dev/install.sh`, `winget install Dits.Dits`), `version 1.0.0`.
- Homepage: `npm install -g @byronwade/dits`, `brew tap byronwade/dits`, `cargo install dits`.
- Download page: `v0.1.2` prebuilt binaries from `github.com/byronwade/dits/releases/latest`.

Three different org/domain/tap namespaces (`dits-io`, `dits.dev`, `byronwade`) and a version
that ranges from `0.1.2` to `1.0.0`. None of the package-registry/tap/installer endpoints are
verifiable in-repo. **Recommend:** verify which (if any) are published; collapse to one
namespace; gate the rest as "coming soon".

---

## HIGH — status contradictions and metadata drift

### H1. VFS / `mount` status is contradictory on every surface
Reality: real, but **feature-gated (`--features fuser`), local-only, not in default build.**
- About page → "FUSE/WinFSP virtual filesystem mounts (`dits mount`) — **Working today**"
- How-it-works → "Virtual filesystem — **Roadmap** — Designed; not yet shipped"
- FAQ → "Dits **can** mount a repository as a normal drive…"
- Download page → lists macFUSE/FUSE3/Dokany as real install requirements
- Docs (`how-dits-works.md`, `guides/performance.md`) → teach `dits vfs mount`, but
  `dits vfs` **is not a command at all** (the real command is `dits mount`).

**Fix:** one consistent statement — "implemented, local-only, requires a `fuser`-enabled
build; remote hydration is roadmap" — and stop documenting the non-existent `dits vfs`.

### H2. Version string drift
`1.0.0` (getting-started.md, first-time-setup.md) vs `0.1.2` (download page) vs `0.1.0`
(`Cargo.toml`, `benchmarks.md`). The `1.0.0` strings also collide with the alpha banner.

### H3. Invented CLI commands documented as working
None of these exist in the canonical command set (`apps/cli/src/commands`, STATUS.md,
cli-reference.md), yet are documented flatly with examples:
`dits auth login/status` (first-time-setup.md), `dits doctor` (getting-started.md),
`dits vfs *`, `dits jobs`, `dits remote test`, `dits cache warm`, `dits migrate`,
`dits rm/mv/ls-files/cat-file/rev-parse/hash-object` (reference/cli.md).
`reference/cli.md` even documents `dits vfs` in detail while its own note says it was
"never implemented".

### H4. License inconsistency
Canonical: **`Apache-2.0 OR MIT`** (`Cargo.toml`, `LICENSE` + `LICENSE-MIT`). But:
- Homepage trust badge: "**MIT Licensed**" (drops Apache).
- License page: "dual-licensed under Apache-2.0 OR MIT" (correct).
- About page: "Apache 2.0 + MIT".
- README header references the license inconsistently across sections.
"100% open source under the MIT license" (homepage FAQ) is inaccurate — it's dual-licensed.

### H5. GitHub org / Discord mismatch
About page links `github.com/dits-dev/dits` and `discord.gg/dits`; every other page and the
`Cargo.toml` repository field use `github.com/byronwade/dits`. At most one is real.

### H6. FastCDC parameter drift across docs
Four different "canonical" parameter sets are stated:
- `concepts.md`: min 32KB / avg 64KB / max 256KB
- `benchmarks.md`: min 128KB / avg 1MB / max 4MB
- `how-dits-works.md`: min 256KB / avg 1MB / max 4MB
- cli-reference sample output: avg 64KB

Pick the values actually used in `packages/dits-core` / `apps/cli/src/core/chunk.rs` and
make every doc cite them.

### H7. Count drift
README "60+ Commands" vs cli-reference "80+ subcommands"; "120+ Tests" vs STATUS "~123".
Minor, but pick one source.

---

## MEDIUM — aspirational marketing that outruns the product

### M1. `docs/marketing/revolutionary-vision.md` & `unique-positioning.md`
Make claims the live site (and `positioning.md`'s own guardrails) deliberately avoid:
"AI Creative Assistant", "Semantic Creative Versioning", "Real-time collaboration"
(live cursors in Premiere/Resolve/Pro Tools), "$10M+ ARR in year 2", "30% of creative VCS
market", "20+ major studios", pricing "$29/$99 per user", "1TB project opens in 2 seconds",
"instant visual search across petabytes". These contradict the site's own alpha banner:
*"in early development by a single developer… may cause data corruption."*
**Recommend:** mark these two files clearly as internal vision/strategy (not product
status), or move them out of `docs/marketing/`.

### M2. About page audience vs maturity
About targets "major studios" and "Enterprise Media… fine-grained access control and audit
trails", and Ditshub promises "Real-time collaboration & permissions / Cloud render
compute" — none of which exist, and all of which clash with the alpha banner.

### M3. Hardcoded benchmark numbers in prose
The web `/benchmarks` page is **healthy** (data-driven from a reproducible measured run) and
`/ai/benchmarks` is honestly labeled "Modeled, not measured". But About and how-it-works
**hardcode** spike figures (98.3% dedup, 7.4× less data, 0.19 MiB, 88.6 MiB) that aren't
tied to the regeneratable data set, so they can silently go stale.

### M4. Playground vs how-it-works
Playground: "Real engine · WebAssembly · runs locally — the same code the CLI runs". How-it-
works calls the in-browser engine demo "coming soon". Resolve which is true.

### M5. `docs/operations/performance-tuning.md` checklist ticks roadmap features as done
Marks "✅ QUIC high-throughput transport configured (1000+ concurrent streams)" and
"✅ Resolved: QUIC high-throughput + multi-peer downloads" — contradicts STATUS roadmap
status (mitigated only by the file-level legacy banner).

---

## What's already good (keep / use as the template)

- **`docs/STATUS.md`** — accurate single source of truth.
- **`docs/user-guide/cli-reference.md`** — exemplary: per-section roadmap banners, correctly
  marks `auth`/`vfs`/network ops as absent/roadmap, gates `mount` behind `--features fuser`.
- **Live web `/benchmarks`** — data-driven from a reproducible run; no hardcoded numbers.
- **`/ai/benchmarks`** — explicitly "Modeled, not measured".
- **Most live marketing pages** — carry "Sync engine on the roadmap" / "Coming soon" badges
  on sync and P2P, with an at-point "networked sync is in active development" caveat.
- **`docs/marketing/positioning.md`** — has explicit guardrails ("Never imply network sync,
  P2P, or QUIC delta transfer work today").

---

## Recommended remediation order

1. **Purge legacy-backend drift** (C1, C2, C3): remove or clearly quarantine
   `data-structures/remote.md`, the README Self-Hosting/Enterprise/REST-API/perf-table tail,
   and the `operations/*` network examples. Make the "quarantined backend" banner state
   plainly that those commands transfer no data.
2. **Fix installation** (C4): verify which artifacts exist; collapse to one
   org/domain/tap; version string to a single value; gate unpublished channels.
3. **Reconcile VFS status** (H1) and remove the non-existent `dits vfs` command from docs.
4. **One version, one license, one GitHub org, one FastCDC param set** (H2, H4, H5, H6).
5. **Strip invented CLI commands** (H3).
6. **Reframe `revolutionary-vision.md` / `unique-positioning.md`** as internal strategy (M1).
7. **Add a STATUS.md pointer** to the top of every user-facing doc so future drift is caught.
