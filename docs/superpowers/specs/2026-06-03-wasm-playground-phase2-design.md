# Design: Phase 2 — Real-engine Playground via WebAssembly

**Date:** 2026-06-03
**Status:** Approved for spec review (toolchain spike passed)
**Author:** Byron Wade (with Claude)
**Area:** Rust core (`apps/cli` → new `dits-core` + `dits-wasm` crates) + `apps/web` Playground
**Depends on:** Phase 1 (`/playground` stub already shipped)

---

## 1. Goal

Replace the `/playground` stub with a live experience that runs **the actual Dits
chunking + hashing engine** in the browser via WebAssembly. The user drops a file (or
edits text), and the genuine FastCDC + BLAKE3 computation — the same code the CLI runs —
executes locally, with nothing uploaded. They watch it chunk, hash, deduplicate, and see
how few chunks change after an edit.

This is not a re-implementation or a canned animation. The same Rust source compiles to
both the CLI and the browser.

## 2. Spike results (completed 2026-06-03 — de-risks this spec)

A throwaway crate (`tmp/wasm-spike`, deleted after) mirroring `chunk_data_with_refs`
(FastCDC 16K/64K/256K + BLAKE3 per chunk) was built for wasm:

- `cargo build --target wasm32-unknown-unknown` — **compiles in ~9s**. `blake3 1.8.5`
  and `fastcdc 3.2.1` build cleanly; **blake3 auto-selects its portable backend, no
  feature flags required**.
- `wasm-pack build --target web` (wasm-pack 0.15.0) — **succeeds end-to-end**, emits
  `pkg/` with wasm + JS bindings + `.d.ts`, wasm-opt applied.
- **Bundle: 34 KB wasm** (~15 KB gzipped). Bundle size is a non-issue.
- Generated API: `chunk(data: Uint8Array) => ChunkInfoOut[]` with typed `{offset,
  length, hash}`. Clean, ergonomic from TS.

Toolchain prerequisites now satisfied on this machine: `wasm32-unknown-unknown` target
added; `wasm-pack` installed via Homebrew.

## 3. Architecture

### 3.1 `dits-core` — new leaf crate (genuine code sharing)

Extract the pure-compute core so the CLI and the browser share **one** source of truth.

- New crate (proposed path `packages/dits-core`, added to the workspace `members`).
- Move `apps/cli/src/core/chunk.rs` and `apps/cli/src/core/hash.rs` into it. `hash.rs`
  has no intra-crate deps; `chunk.rs`'s only intra-crate dep is `core::hash` — both move
  together cleanly.
- `apps/cli` depends on `dits-core` and re-exports it at `crate::core::{chunk, hash}` (a
  thin `pub use dits_core::...` shim) so the rest of the CLI keeps compiling unchanged —
  minimal blast radius on the production binary.
- **rayon gating:** `chunk.rs` has `use rayon::prelude::*` and `chunk_data_parallel` /
  `chunk_data_with_refs_parallel`. Put rayon behind a non-default `parallel` feature:
  `#[cfg(feature = "parallel")]` on the rayon import and the two parallel fns. `apps/cli`
  enables `dits-core/parallel`; the wasm crate does not. The sequential
  `chunk_data` / `chunk_data_with_refs` (what the playground uses) stay always-available.

### 3.2 `dits-wasm` — thin wasm-bindgen wrapper

- New crate (proposed `packages/dits-wasm`), `crate-type = ["cdylib"]`, **excluded from
  the main workspace build** (its own `[workspace]` table) so a normal `cargo build`/CI
  for the CLI never pulls the wasm target.
- Depends on `dits-core` (default features only → no rayon).
- Exposes a minimal, stable API over the real engine:
  - `chunk(data: &[u8]) -> Vec<ChunkOut>` where `ChunkOut = { offset, length, hash_hex }`
    — wraps `dits_core::chunk::chunk_data_with_refs`.
  - A `dedup_summary(...)` helper (unique vs total chunks, bytes stored vs original) so
    the UI doesn't re-derive dedup math in JS — keep the logic in Rust.
- Built with `wasm-pack build --target web --out-dir ../../apps/web/src/wasm/dits`
  (committed output, or generated in `prebuild`). Decision below.

### 3.3 Build integration with Next.js

Two options; **recommended: commit the generated `pkg`** into
`apps/web/src/wasm/dits/` and import it directly.

- The wasm is 34 KB and changes only when the Rust core changes; committing it keeps the
  web build hermetic (no Rust toolchain needed for `next build` / Vercel).
- A `package.json` script `build:wasm` (`wasm-pack build … --target web`) regenerates it;
  document that it must be re-run when `dits-core` changes. A CI check can rebuild and
  `git diff --exit-code` to catch staleness.
- Load lazily in the Playground client component: `const m = await import(
  "@/wasm/dits/dits_wasm.js"); await m.default(); m.chunk(bytes)`. Keeps it out of the
  initial bundle; runs only on the `/playground` route.

## 4. Playground UI (`apps/web/src/app/playground/page.tsx` → client experience)

Replace the stub. A client component (`"use client"`) using byronwade-ui + brand tokens,
matching the Phase-1 visual language. Sections:

1. **Input** — drag-and-drop / file picker (any file) **and** an editable text area with a
   sensible default sample. Everything stays in the browser (state this in the UI). Cap
   file size (e.g. 50 MB) with a friendly message to keep the main thread responsive;
   `log()` the cap, don't silently truncate.
2. **Chunk visualization** — render the returned chunks as a horizontal strip; each chunk
   sized proportionally, labeled with short BLAKE3 (`hash[..8]`) and byte size. Identical
   hashes share a color to make dedup visible.
3. **Live stats** — total chunks, unique chunks, dedup %, bytes stored vs original —
   computed by `dedup_summary` in Rust.
4. **Edit → re-chunk diff** — the marquee demo. After an edit, re-run and diff against the
   previous chunk set by hash: highlight changed chunks vs reused. Show "you changed N of
   M chunks — X% reused", proving the content-defined-chunking claim on the user's own data.
5. **Honesty footer** — a note that this is the real engine (link to the source files /
   `dits-core`), and that network sync etc. are CLI/roadmap, not part of the demo.

Performance: run `chunk()` off the main thread in a Web Worker if a synchronous call on a
large buffer janks; the spike's 34 KB module loads instantly, and chunking a few-MB buffer
is sub-100ms, so a worker is a refinement, not a blocker. Decide during implementation
based on measured jank.

## 5. Correctness — golden test (must-have)

The extraction must not change engine behavior. Before/after the `dits-core` move, run the
existing `chunk.rs` test suite (it already covers determinism, reconstruction, dedup,
parallel-matches-sequential). Add a **golden test**: a fixed input buffer → assert the
exact ordered list of `(offset, length, hash_hex)` is identical to a snapshot captured
from `apps/cli` before extraction. This guarantees the browser and CLI produce
byte-identical chunk hashes.

## 6. Testing / verification

- `cargo test -p dits-core` (and `--features parallel`) passes; CLI `cargo build` +
  existing CLI tests pass unchanged after the shim.
- `cargo build --target wasm32-unknown-unknown -p dits-wasm` passes; `wasm-pack build`
  emits the package; a tiny node/headless harness calls `chunk()` on a known buffer and
  checks the hashes against the golden snapshot.
- `next build` passes with the wasm import; `/playground` works in-browser: drop a file,
  see chunks/hashes/dedup; edit text, see the reuse diff. Verify on the dev server.
- Lighthouse/route check: wasm loads only on `/playground`, not site-wide.

## 7. Risks & mitigations

- **Extraction regresses CLI behavior** → golden test + run full CLI test suite before/after.
- **rayon leaks into wasm build** → `parallel` feature is non-default; `dits-wasm` never
  enables it; CI builds `dits-wasm` for wasm32 to catch any accidental pull-in.
- **Committed wasm goes stale** → `build:wasm` script + CI `git diff --exit-code` after rebuild.
- **Large-file jank** → size cap now; Web Worker if measured necessary.
- **Homebrew `rustup` vs existing toolchain PATH shadowing** → pin the build to the
  rustup-managed toolchain in the `build:wasm` script; document required toolchain.

## 8. Out of scope (Phase 2)

- Network sync, VFS, locking, FACR frame-level demo (FACR pulls in media/FFmpeg paths that
  are not pure-compute — a possible Phase 3, not this).
- Persisting or sharing playground sessions.
- Compiling any async/transport/storage code to wasm.

## 9. Decomposition for the implementation plan

1. Extract `dits-core` (move chunk+hash, feature-gate rayon, add CLI shim) + golden test.
2. `dits-wasm` wrapper + `wasm-pack` build wired into `apps/web` (`build:wasm`, committed pkg).
3. Playground client UI (input → chunk viz → stats → edit-diff), lazy wasm load.
4. Verification pass (CLI tests, wasm golden harness, `next build`, in-browser).
