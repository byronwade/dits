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
4. **The web docs tree (`apps/web/src/app/docs/`)** — the largest and *least* disciplined
   surface. ~75 pages present networking, P2P, QUIC, a hosted REST API, official SDKs,
   Ditshub cloud, and SaaS pricing/SLA **flatly as shipping**, with fabricated terminal
   output and live hosted URLs. Only ~4 of those pages carry any caveat.
5. **Internal contradictions** — VFS "works today" vs "not shipped", version `1.0.0` vs
   `0.1.2`, MIT vs dual-license, two different GitHub orgs, two incompatible P2P command
   surfaces.

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
| Network `push`/`pull`/`sync` | **Stub** — prints placeholder, transfers no data | `repo/push.rs:63-64` ("…implemented in Phase 4b") |
| Network `fetch` | **Partial** — opens an HTTP socket, GETs `/refs`, but discards body / downloads no objects | `repo/fetch.rs:58-78` |
| Network `clone` | **Not implemented** (`bail!`, local path only) | `repo/clone.rs:24-28` |
| `serve` (embedded remote server) | **Real** axum/TCP server serving object bytes, wired into CLI | `store/remote_server.rs:169`, `main.rs:1668` |
| P2P (share/connect/cache/ping/mount) | **Scaffolding** — prints fake success; `ping` prints **fabricated** latency | `advanced/p2p.rs:196,238,371-377` |
| QUIC delta transport | **Implemented & tested** as a library + `stream-demo` command; **not wired** into push/pull | `stream/quic_origin.rs:102,244,284` |
| Streaming | **HLS works** (ffmpeg encode, VMAF/CRF ladder, AES-128); **no DASH** | `stream/encode.rs`, `vmaf.rs`, `playlist.rs` |
| Encryption (AES-256-GCM, Argon2id) | **Real crypto** | `security/encryption.rs:60`, `security/keys.rs:138` |
| Test suite | **469 passing** (0 failed, 3 ignored) | `cargo test --workspace` |
| Hosted backend / REST API / SDK / Ditshub | **Does not exist** (quarantined to `legacy/`, largely stubbed) | `Cargo.toml` exclude; `legacy/README.md` |

`docs/STATUS.md` is **mostly accurate on the roadmap items** and should remain the single
source of truth — **but it has itself drifted in 4 places** (see "Drift in the other
direction" below). It needs a refresh, not replacement.

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

**Externally verified 2026-06-12 (registry lookups):**
| Advertised | Reality |
|---|---|
| `npm install -g @byronwade/dits` (homepage) | ✅ **Exists**, latest **v0.1.5** — but that's a *third* version (vs download page `0.1.2`, docs `1.0.0`) |
| `cargo install dits` (homepage + docs) | ❌ **404 — crate does not exist on crates.io. This command fails.** |
| `@dits/sdk` "official SDK" (web API docs) | ❌ **404 — does not exist on npm** |
| `dits-sdk` "official Python SDK" (web API docs) | ❌ **404 — does not exist on PyPI** |

So the headline npm install is genuinely real (good — and the npm version `0.1.5` should
become the single canonical version everywhere). But `cargo install dits` and the "official"
SDK packages are advertised and **do not exist** — the most concrete, checkable falsehoods in
the whole project.

### C5. The web docs tree (`apps/web/src/app/docs/`) presents an entire hosted product that doesn't exist
This is the **single largest drift surface** — and worse than the markdown docs, because the
markdown docs at least carry roadmap/legacy banners. Across ~75 web doc pages, **only ~4**
(`roadmap`, `guides/glossary`, `guides/large-files`, `cli/vfs`) contain any caveat. The rest
present roadmap/non-existent features flatly, with **fabricated terminal output** and **live
hosted URLs**:
- **Hosted REST API as live:** `docs/api/rest/page.tsx` — "100+ API Endpoints",
  `baseURL: https://api.dits.io/v1`, `curl -X POST https://api.dits.io/v1/repos`, rate limit
  "5,000/hour". `docs/api/webhooks/page.tsx` — "25+ Event Types", HMAC signatures.
  `docs/api/wire/page.tsx` — "The wire protocol is fully documented and open for third-party
  implementations".
- **"Official SDKs" claiming live registry pages:** `docs/api/sdks/page.tsx` —
  `npm install @dits/sdk`, `pip install dits-sdk`, `go get github.com/dits-io/go-sdk`,
  `cargo add dits-sdk`, asserting `npmjs.com/package/@dits/sdk`, `pypi.org/project/dits-sdk/`,
  `crates.io/crates/dits-sdk`, `docs.rs/dits-sdk` exist. **These are externally checkable and
  almost certainly 404.**
- **"Production-Ready Implementation":** `docs/cli-reference/page.tsx` — "All 60+ commands are
  fully implemented with 120+ automated tests"; marks `push`/`pull`/`fetch` status
  **"stable"**, `sync` "beta". `docs/page.tsx` — `implementedCommands` array literally lists
  `"remote","push","pull","fetch","clone","p2p"` and "All 60+ commands are fully implemented".
- **Ditshub managed cloud as live:** `docs/deployment/page.tsx` ("Cloud Managed / Hosted
  platform with Ditshub / Automatic scaling / Global CDN"), `docs/deployment/cloud/page.tsx`
  (full EKS/RDS/S3 + `helm repo add dits https://charts.dits.io`),
  `docs/deployment/self-hosting/page.tsx` (`curl -LO https://releases.dits.io/latest/dits-server`).
- **P2P with fabricated infra & two incompatible command sets:**
  `docs/concepts/peer-to-peer/page.tsx` and `docs/cli/p2p/page.tsx` claim "100% success rate —
  works through any NAT type", signal server `wss://dits-signal.fly.dev`, relay
  `relay.dits.byronwade.com`, join codes + port 4433 — while `docs/guides/collaboration/page.tsx`
  documents a *different* surface (`dits p2p start/discover/sync`, libp2p peer IDs, port 9001).
  Neither matches the real scaffolding.
- **Fabricated network output everywhere:** e.g. `docs/cli/remotes/page.tsx` —
  `remote: Finding chunks: 12,456 (8.5 GB)` / `Receiving objects: 100% (45/45)`;
  `docs/cli/repository/page.tsx` — `Repository ready (125 TB of files available on demand)`.

**Bonus contradiction:** the web tree's own `docs/roadmap/page.tsx` labels Remote/P2P
"In Progress" and Ditshub "Q4 2025 / Planned" — directly contradicting the cli/api/deployment
pages that show those same features working.

### C6. SaaS pricing & SLA documented with no disclaimer
`docs/business/pricing.md` and `docs/business/sla.md` carry **no caveat at all** and present a
full commercial offering: Free / Pro ($20/user/mo) / Team ($50/user/mo) / Enterprise tiers,
storage & transfer overages (`$0.02/GB/month`, `$0.05/GB`), "Web UI access", "API access",
multi-region — plus uptime guarantees, service credits, and P95 latency commitments. None of
this exists. These read as a live, purchasable product.

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
Four different versions in play: `1.0.0` (getting-started.md, first-time-setup.md), `0.1.2`
(download page), `0.1.0` (`Cargo.toml`, `benchmarks.md`), and **`0.1.5`** (the actual
published npm package — verified). The `1.0.0` strings also collide with the alpha banner.
**Canonical should be the published npm version (`0.1.5`)**; align `Cargo.toml`, the download
page, and all docs to it (or derive them from it).

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

### H7. Count drift — test count is badly *understated*
README "60+ Commands" vs cli-reference "80+ subcommands". More importantly, the test count
is stale in the *conservative* direction: README "120+ Tests" and STATUS.md "~123" vs.
**actual 469 passing** (`cargo test --workspace`). This is the rare case where the docs
*undersell* — fix it upward.

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

## Drift in the *other* direction — STATUS.md & README *undersell* the product

The honesty pass over-corrected in a few spots. These are claims the product can safely make
but doesn't, plus one place where STATUS.md is now wrong:

- **Test count** (STATUS.md:8/:51 "~123", README "120+ Tests"): actual **469 passing**
  (`cargo test --workspace`). ~4× undercount.
- **`serve`** (STATUS.md:37 "config/scaffolding only"): `store/remote_server.rs:169` is a
  real axum server serving object bytes, wired at `main.rs:1668`. It works.
- **QUIC delta transport** (STATUS.md:40 "designed, not implemented"): `stream/quic_origin.rs`
  is a real, **tested** QUIC implementation (`push_delta` sends only missing segments;
  round-trip test at :284), exposed via `stream-demo`. It's real — just not wired into the
  `push`/`pull` porcelain.
- **FUSE mount** is fully implemented (`vfs/fuse.rs:334` `impl Filesystem`, real `mount2`/
  `fusermount -u`), only feature-gated off. STATUS.md's "what works today" omits it entirely,
  so a reader would assume the code doesn't exist.
- Genuinely working and **safe to market more confidently:** real AES-256-GCM + Argon2id
  encryption, the FFmpeg-backed FACR pipeline, HLS streaming with a VMAF/CRF ladder, and the
  469-test suite.

**Action:** refresh STATUS.md (test count, `serve`, QUIC, mention FUSE-is-implemented-but-
gated) so it stays the trustworthy anchor every other doc points to.

## One genuinely alarming item — fabricated runtime output

`apps/cli/src/commands/advanced/p2p.rs:371-377`: the `dits p2p ping` command prints
**hardcoded fake network stats** — `"64 bytes from 192.168.1.100 ... time=12.3ms"` — with no
real network activity. This isn't roadmap labeling; it's a command that actively lies to the
user about a connection that doesn't exist. Either make it real, have it error
("not implemented"), or remove it. (Same pattern, lower stakes: `p2p share`/`connect` print
"✅ Repository shared/Connected successfully!" without transferring anything.)

## What's already good (keep / use as the template)

- **`docs/STATUS.md`** — accurate on roadmap items and the right idea; needs the 4 fixes above.
- **`docs/user-guide/cli-reference.md`** — exemplary: per-section roadmap banners, correctly
  marks `auth`/`vfs`/network ops as absent/roadmap, gates `mount` behind `--features fuser`.
- **Live web `/benchmarks`** — data-driven from a reproducible run; no hardcoded numbers.
- **`/ai/benchmarks`** — explicitly "Modeled, not measured".
- **Most live marketing pages** — carry "Sync engine on the roadmap" / "Coming soon" badges
  on sync and P2P, with an at-point "networked sync is in active development" caveat.
- **`docs/marketing/positioning.md`** — has explicit guardrails ("Never imply network sync,
  P2P, or QUIC delta transfer work today").
- **The `ai/docs/` web tree** — the honesty gold standard: `ai/docs/roadmap/page.tsx` states
  "If a capability is not under 'Working today,' do not depend on it yet";
  `ai/docs/concepts/tensor-chunking` is explicitly "a roadmap and design topic, not a shipped
  feature". Use this tree's discipline as the template for fixing the main `docs/` web tree.
- **`apps/web/src/app/docs/roadmap/page.tsx`** — correctly labels Remote/P2P/Ditshub as
  in-progress/planned; it's the rest of the web docs tree that contradicts *it*.

---

## Recommended remediation order

1. **Fix the web docs tree** (C5, C6) — *highest priority*: it ships a whole hosted product
   (REST API, SDKs, Ditshub cloud, SaaS pricing/SLA, P2P) that doesn't exist, with no caveats
   and fabricated output, to anyone who clicks "Docs". Either gate every roadmap page behind
   the same discipline as `ai/docs/`, or remove the API/SDK/cloud/pricing/SLA/P2P pages until
   they're real. Verify whether `@dits/sdk` / `dits-sdk` / `api.dits.io` actually exist; if
   not, the "official SDK" and "100+ endpoints" pages are the most reputationally dangerous.
2. **Purge legacy-backend drift** (C1, C2, C3): remove or clearly quarantine
   `data-structures/remote.md`, the README Self-Hosting/Enterprise/REST-API/perf-table tail,
   and the `operations/*` network examples. Make the "quarantined backend" banner state
   plainly that those commands transfer no data.
3. **Fix installation** (C4): verify which artifacts exist; collapse to one
   org/domain/tap; version string to a single value; gate unpublished channels.
4. **Reconcile VFS status** (H1) and remove the non-existent `dits vfs` command from docs.
5. **One version, one license, one GitHub org, one FastCDC param set** (H2, H4, H5, H6).
6. **Strip invented CLI commands** (H3).
7. **Reframe `revolutionary-vision.md` / `unique-positioning.md`** as internal strategy (M1).
8. **Fix the fabricated `dits p2p ping` output** — make it real, error out, or remove it.
9. **Refresh STATUS.md** in the 4 under-claiming spots (test count → 469, `serve` is real,
   QUIC is implemented, FUSE is implemented-but-gated) so it stays the trustworthy anchor.
10. **Add a STATUS.md pointer** to the top of every user-facing doc so future drift is caught.
