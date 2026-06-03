# Dits — Active Review & Video-Diff Vision

*Generated audit of the repository as it stands, plus a concrete technical thesis for "real git diffing for video/photo." Every claim below is grounded in the code, not the README.*

---

## TL;DR

- **The local engine is real and good.** Content-addressed store, convergent AES-256-GCM encryption, FastCDC chunking, **real ISOBMFF/MP4 atom parsing + reconstruction**, git2 hybrid storage for text, proxy checkout, ffmpeg GOP segmentation, NLE project parsing. ~123 tests in the canonical engine (`apps/cli`), plus another ~100 in the now-quarantined backend crates. The README's "120+ tests" and "format-aware MP4" claims are **true**.
- **The product has two heads fighting each other.** The repo ships **two complete, separately-built `dits` binaries** with no shared code. This is the single biggest problem.
- **The networking story is a stub.** P2P (QUIC/wormhole), remote push/pull/fetch, and bi-directional sync are placeholders ("Phase 4b"). The README presents them as core capabilities. This is the credibility gap to close — *not* the local engine.
- **The core thesis has a physics problem.** Chunk-based dedup **cannot** diff re-encoded video. It works for appends, remux, metadata-only edits, and stream-copy trims — and collapses to ~0 dedup the moment an NLE re-exports. Solving this for real requires owning a **frame-addressable intermediate representation**, not chunking whatever bytes the NLE produced. That's the revolutionary move, and it's technically coherent (Part 3).

---

## Part 1 — Structural problems (highest leverage)

### 1.1 Two competing `dits` binaries (P0)
The workspace builds **two** things both named `dits`:

| | `apps/cli` | `apps/cli/crates/*` |
|---|---|---|
| Package / bin | `dits` (`src/main.rs`) | `dits-cli` (`src/main.rs`), also bin `dits` |
| Size | **34,567 LOC** | **12,302 LOC** |
| Identity | Local-first, git-like CLI (real) | SaaS backend: `dits-api` (axum), `dits-db` (sqlx/pg), `dits-worker`, `dits-storage` (s3), `dits-protocol`, `dits-sdk`, `dits-chunker` |
| State | Feature-rich, tested | Largely stubbed — `dits-worker/src/main.rs`: `// TODO: Implement job processing`; `dits-cli/src/commands.rs` is a 170-line stub |
| Chunking | upstream `fastcdc` crate | 9 hand-rolled chunkers, all dead |

These share **no code**. They encode two different products (a local CLI vs. a cloud backend). Both packages emit a binary artifact named `dits` into the shared `target/` dir (last-built wins; `cargo run` needs `-p` to disambiguate), and the maintenance surface is doubled. On the evidence (LOC, completeness, recent commits touching `apps/cli`), `apps/cli` **appears** to be the canonical, maintained one and the `crates/*` workspace appears unmaintained — but **confirm which is intended to be the future before removing anything.** If `apps/cli` is canonical, the recommendation is: the local-first engine is the real asset; the backend crates should be deleted or later rebooted as thin services *that depend on `apps/cli`'s engine as a library*, not as a parallel fork of it.

### 1.2 Nine dead chunking algorithms
`apps/cli/crates/dits-chunker` implements `fastcdc, parallel_fastcdc, keyed_fastcdc, rabin, ae, gear_table, fixed, adaptive, chonkers, video` — **none are wired into any ingest path** (no factory maps the `ChunkerType` enum to an implementation; the worker that would run them is a TODO). The live binary uses the upstream `fastcdc` crate in `apps/cli/src/core/chunk.rs`. This is ~2,200 LOC of research code masquerading as product. Move it to a `research/` or `benches/` location or delete it; the comparison is interesting but it is not the system.

### 1.3 The README over-promises the network layer
Real and wired: local commit/add/status/diff/log/branch/merge/checkout, MP4 deconstruct/reconstruct, proxy checkout, encryption, segmentation, local-filesystem clone.
Stubbed (prints "not yet implemented" / "Phase 4b" and returns `Ok`):
- `p2p/host.rs:69-84`, `p2p/client.rs:50-66`, `p2p/transfer.rs:224` — no QUIC data actually moves.
- `commands/repo/{push,pull,fetch,sync}.rs` — no network object transfer.
- `commands/repo/sync.rs` — "simplified merge" can overwrite local state (**data-loss risk on divergence**, §2.1).

The fix is not to build all of it now — it's to **stop advertising it as done.** A tool that nails local-first media versioning is compelling on its own.

---

## Part 2 — Concrete code findings

### 2.1 Bi-directional sync can lose data (P1)
`commands/repo/sync.rs` does a "simplified merge" with no conflict detection on divergent branches; combined with the stubbed fetch, a sync can overwrite local refs. Either gate it behind `--force` with a loud warning or finish real 3-way ref reconciliation before exposing it.

### 2.2 `force_keyframes: true` defeats segment dedup (design bug)
`segment/segmenter.rs` defaults `force_keyframes: true`. Forcing keyframes at segment boundaries requires **re-encoding**, which changes the bytes of every segment → convergent dedup drops to ~0 across versions. For dedup you want `-c copy` segmentation that cuts only on *existing* keyframes. The current default optimizes for clean boundaries at the cost of the project's entire reason to exist. (This is a symptom of the deeper issue in Part 3.)

### 2.3 MP4 round-trip is only proven for the happy path
`mp4/{parser,deconstructor,reconstructor,offset_patcher}.rs` is genuinely good (parses `moov`/`mdat`, locates and patches `stco`/`co64`). But: no test proves a **byte-identical** round-trip on real-world files (fragmented MP4 / `moof`, multiple `mdat`, `edts`/edit lists, `co64`-only files, MOV with `wide` atoms). `sparse_checkout.rs:257` still has "TODO: proper MP4 reconstruction." Add golden-file round-trip tests with real camera/NLE output before trusting it with someone's footage.

### 2.4 No real sample media in the repo
There is **not a single `.mp4/.mov/.h264/.raw`** anywhere outside web assets, and no test feeds real video through the MP4 or segmenter paths. The most important, most format-fragile code is exercised only on synthetic bytes. This is the highest-ROI testing gap.

### What is solid (don't touch)
*Based on a targeted pass, not an exhaustive line-by-line audit:* `store/objects.rs` verifies BLAKE3 on read (201-207, 255-260); `security/encryption.rs` is real convergent AES-256-GCM with tamper tests; chunk reconstruction is byte-exact and tested. No `todo!()`/`unimplemented!()` panics surfaced in the live tree. The foundation looks trustworthy, but "no critical bugs surfaced in a skim" is not "none exist" — a full audit of the commit/checkout/merge paths is still warranted.

---

## Part 3 — Real git diffing for video/photo (the actual thesis)

### The physics problem
FastCDC dedup assumes an edit only **shifts** bytes (insert/delete), leaving most bytes identical so the rolling hash re-syncs. Compressed video breaks both assumptions:
1. **Inter-frame coding** — every P/B frame depends on neighbors; a change near the start perturbs the entire GOP.
2. **Re-encoding** — any NLE export, color grade, or transcode produces a *completely different bitstream* for visually-similar content. Zero bytes match. Dedup → 0.

So today's engine genuinely dedups exactly four cases: **append** (kept recording), **remux** (container change, same mdat), **metadata-only** edits (tags/`moov`), and **stream-copy trims** landing on real keyframes. Every "I graded it and re-exported" — the 90% case for editors — dedups nothing. **You cannot diff a re-encoded video by hashing its bytes. Full stop.**

The user's instinct ("invent our own encoding") is correct. Here is the coherent version.

### Separate the two problems the word "diff" hides
1. **Storage dedup** — don't re-store/re-upload unchanged content.
2. **Semantic diff** — show *what visually/structurally changed* (which frames, which regions).
Chunking attempts (1) and fails on re-encode; it never even attempts (2).

### The proposal: Dits owns a Frame-Addressable Canonical Representation (FACR)
Stop versioning "the file the NLE produced." Make Dits own a canonical, all-intra, content-addressed representation, and treat MP4/MOV/ProRes as **import/export formats** — exactly how git owns blobs/trees and treats your editor's autosave as irrelevant.

**On ingest** (orchestrated compute — the README's "compute is a feature" principle finally earns its keep):
- Decode to frames. Re-encode each frame as an **independently-decodable unit** (visually-lossless or lossless mezzanine: AV1/HEVC **intra-only**, ProRes/DNxHR-style, or JPEG-XL/per-frame). No cross-frame prediction → every frame is addressable.
- **Content-address each frame** (`blake3(frame_pixels)` or perceptual hash + exact hash). A video version = an ordered **frame manifest**: `[frame_hash, presentation_ts, ...]` + an edit/transform log. This is literally a git tree for pixels.

**Two cases — and the headline only fully holds for one of them (this is the crux):**

- **Case A — Dits owns the edit (non-destructive log over canonical frames).** A trim/reorder/insert/grade is recorded as a *transform over frame hashes*, not a re-encode. A grade touching frames 1200–1350 stores only those 150 frames (or their residuals); the rest stay as unchanged hashes. `dits diff` says *"150 frames changed, regions X,"* and renders a visual before/after — semantic diff (2) and dedup (1) at once, with **~0 new bytes** for everything untouched. **This is the real revolution, and it is the argument for why Dits must own a non-destructive editing model — not merely chunk what an NLE emitted.**

- **Case B — external NLE re-export → re-ingest (Premiere/Resolve exports the whole timeline, you re-add it).** Every codec in play (H.264/HEVC/ProRes/DNxHR — all DCT-based, lossy) **re-quantizes every frame**. A frame whose *source* was untouched still decodes to slightly different pixels after the round-trip, so `blake3(frame_pixels)` matches **nothing**. Exact-hash dedup → 0. Here you fall back to **perceptual-hash matching + residual coding** (find the nearest prior frame, store the delta). It works, but it's the fuzzy, lossy, compute-heavy path — *not* the "0 new bytes" path. The only way to get Case-A economics for external workflows is to capture the edit decisions (EDL/XML/OTIO) and reconstruct the non-destructive log, rather than diffing the flattened export.

So the strategic conclusion is sharp: **the byte-exact magic requires Dits to own editing.** Selling "drop your re-exports in and they dedup perfectly" overpromises; selling "edit non-destructively in Dits (or import your EDL) and get true frame-level version control" is honest and still unprecedented.
- **Photos fall out for free.** RAW is already tile/frame-addressable; a non-destructive edit becomes an **edit-log manifest over the original** (content-addressed Lightroom sidecars, versioned). Burst photos dedup per-frame.
- **Within-frame dedup.** Graded/denoised frames are mostly unchanged spatially → store a **residual** against the nearest-matching frame hash (tile + motion search across the frame store), then zstd. Even "every frame changed slightly" stays cheap.

**Honest costs (state them up front):**
- **Storage:** all-intra is bigger than long-GOP. Mitigations: per-frame residual coding + zstd; keep FACR as the *canonical store* and **export** a compressed deliverable on checkout (you already have the proxy machinery for this). For most editorial work the dedup win across versions dwarfs the per-version size penalty.
- **Compute:** ingest transcode is real CPU/GPU. This is orchestratable and cache-friendly (only new frames transcode). It's also a *moat* — it's the hard part competitors won't copy.
- **Fidelity:** must be visually-lossless mezzanine (or true-lossless for archival/masters). Be explicit about the tier per repo.

**Migration path (don't boil the ocean):** today's MP4 atom-split is the v0. v1 = FACR behind a flag for a single codec (start with **ProRes/DNxHR or intra-AV1**, the formats editors already mezzanine to). Prove byte-or-perceptually-exact round-trip on real footage. Ship `dits diff --visual`. That single feature — *"see exactly which frames changed between two cuts, and only store the deltas"* — is something **no VCS on earth does**, and it's the headline.

---

## Part 4 — Positioning

**Wedge: local-first, format-aware media VCS for editors — the part that actually works and is differentiated.** Don't lead with P2P/cloud (stubbed) or with "Git but bigger" (everyone says that). Lead with the three real, hard-to-copy capabilities:
1. **Proxy-native checkout** — clone a 2 TB project, get working proxies instantly, pull full-res frames on demand. (Mostly built.)
2. **Structure-aware MP4** — version metadata and media separately; metadata edits cost nothing. (Built.)
3. **NLE-project hybrid diff** — git-grade line diff/merge/blame on FCPXML/Premiere XML *and* chunk dedup on the payload. (Built.)

Then the roadmap headline is Part 3: **frame-level visual diff.** That's the "revolutionize the industry" line, and it's grounded in a real plan rather than a slogan.

**For developers specifically:** an embeddable Rust engine (`dits` as a library) + a clean CLI + content-addressed store is genuinely useful for game assets, ML datasets, and design files. Ship the library cleanly (it's currently entangled with the binary) and that's a second audience.

---

## Recommended sequence

1. **Resolve the two-binary identity** — delete/quarantine `apps/cli/crates/*`; make `apps/cli` canonical and library-first.
2. **Tell the truth in the README** — mark P2P/remote as roadmap, not features.
3. **Golden-file MP4 round-trip tests on real footage** — earn trust in the one feature that touches user data.
4. **Prototype FACR v1** behind a flag for one mezzanine codec + ship `dits diff --visual`. This is the revolution; everything above clears the runway for it.
