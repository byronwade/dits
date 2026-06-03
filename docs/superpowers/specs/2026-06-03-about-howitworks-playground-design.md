# Design: About refresh, "How it works" page, Git-vs-Dits comparison & developer Playground

**Date:** 2026-06-03
**Status:** Approved for spec review
**Author:** Byron Wade (with Claude)
**Area:** `apps/web` (marketing/docs site) + (Phase 2) Rust core → WASM

---

## 1. Goal & context

Make the public site explain Dits more clearly and honestly:

1. **Rework the About page** — more detailed but still simple to understand.
2. **Add a top-level "How it works" page** (new nav item) that expands the full mental model.
3. **Strengthen the Git-vs-Dits comparison** with the real, honest story.
4. **Add a developer Playground** where people can try Dits in real time — running the **actual Rust engine compiled to WebAssembly**.

The work is split into two phases so the certain-value content ships without waiting on the
Rust/WASM toolchain:

- **Phase 1 (this spec drives the first plan): content + nav.** About refresh, new
  `/how-it-works` page, enhanced comparison, nav/footer updates, and a Playground **stub**
  page ("coming soon"). Independent of WASM; shippable on its own.
- **Phase 2 (separate spec/plan): the real-engine Playground.** Extract the pure-compute core
  to a `dits-core` leaf crate, add a `wasm-bindgen` wrapper, build with `wasm-pack`, and wire
  the live Playground. Gated behind a toolchain spike (see §7).

This document specifies **Phase 1 in full** and **scopes Phase 2** (its detailed design is a
follow-up doc).

### Design-system & accessibility constraints (apply to every new/edited page)

- Use the **byronwade-ui** design system: shadcn "new-york" registry
  (`https://ui.byronwade.com/r/{name}.json`), components under `@/components/ui`, brand tokens
  in `apps/web/src/app/globals.css`. **No new design primitives** — reuse existing components
  (`card`, `badge`, `button`, `table`, `tabs`, `code-block`, `segmented-control`, `gauge`,
  `status-dot`, `accordion`) and the `@/components/diagrams` set.
- Brand token is `--brand` (lime/olive green); `--primary` is the dark neutral. Use `text-brand`
  / `bg-primary` etc. as the existing pages do — never hard-code hex.
- Follow `docs/ai/AGENTS.md`: `<main id="main-content" tabIndex={-1}>` skip-link target, correct
  heading hierarchy (single `h1`), `aria-hidden` on decorative icons, **redundant status cues**
  (never color-only — pair with icon + text), hit targets ≥24px (44px mobile), visible focus
  rings, respect `prefers-reduced-motion`.

### Messaging principle: radical honesty (user-selected)

Lead with the **format-aware / FACR** differentiator using **real numbers**, and openly show
where generic chunking *loses*. Ground all claims in repo sources — do not invent stats.

**Source of truth for claims:**
- `README.md` §"Implementation status (what is wired today vs. roadmap)" (lines ~414–425) and
  §"Core Features" / §"Quick Facts".
- `tmp/spike/RESULTS.md` benchmark scenarios (real, one-machine numbers — label them as such):
  - **A (full re-export):** dits *generic* chunking is **worst** (88.55 MiB delta) — show this.
  - **B (metadata-only mp4):** dits-cdc 0.19 MiB **beats** restic (0.77) and borg (5.93).
  - **C (FACR re-grade):** 5 new frames / 295 deduped → **98.3% saved**.
  - **D (incremental HLS):** re-encode 1 of 6 segments → **7.4× less shipped, 86.5% saved**.
- Live benchmark JSON already served at `/benchmarks/latest.json` (FastCDC chunk MB/s, BLAKE3
  hash MB/s) — the `BenchmarksHighlights` component is the reuse pattern.

**Honesty rule:** anything not shipped (QUIC delta sync, P2P/NAT traversal, network
push/pull/fetch, bi-directional network sync) MUST be visibly labeled **Roadmap / scaffolding**,
not presented as working. FACR is labeled **experimental**.

---

## 2. Phase 1 — components & files

### 2.1 Navigation (`apps/web/src/components/header.tsx`)

Extend the `navItems` array (drives both desktop nav and mobile sheet — single source):

```
Docs · How it works · Benchmarks · Playground · About · Community
```

- Add `{ title: "How it works", href: "/how-it-works" }`
- Add `{ title: "Playground", href: "/playground" }`
- No structural changes; existing active-state logic (`pathname.startsWith`) already handles them.

**Footer (`apps/web/src/components/footer.tsx`):** add "How it works" and "Playground" to the
**Product** link group for parity.

### 2.2 New page: `/how-it-works` (`apps/web/src/app/how-it-works/page.tsx`)

Server component with `generateMetadata` via `@/lib/seo` (mirror About's metadata block, new
canonical `/how-it-works`). Section order (each: **plain-English first, then the technical
detail**; one section component per concept, kept small):

1. **Hero** — "How Dits works, from bytes to commits." Sub: one-paragraph promise.
2. **The mental model** — `chunk → hash → deduplicate`. Reuse the 3-card pattern already in
   About's "How Dits Works" + a diagram from `@/components/diagrams`.
3. **Content-defined chunking (FastCDC)** — why CDC beats fixed-size (insert-at-start example:
   fixed = all chunks shift / CDC = only nearby chunk changes). Pull the framing from
   `apps/cli/src/core/chunk.rs` doc comments. Show the real default sizes (16K/64K/256K) and the
   per-profile configs (small/media/project) as a small reference.
4. **Content addressing (BLAKE3)** — 32-byte hashes, identical chunks stored once → dedup.
   Optionally surface live FastCDC/BLAKE3 throughput via the `BenchmarksHighlights` reuse pattern.
5. **Format-aware & FACR (the differentiator)** — MP4/ISOBMFF parse → deconstruct
   (`moov`/`mdat`) → reconstruct; frame-addressable video (FACR, **experimental**). This is where
   the real wins live (scenarios B/C/D). Mark FACR experimental.
6. **Storage: hybrid Git + Dits** — libgit2 for text, Dits chunking for binary; full Git ops on
   creative assets.
7. **VFS · Locking · Sync** — on-demand hydration (FUSE/WinFSP), distributed locking, QUIC delta
   sync. **Clearly labeled Roadmap/scaffolding** where not shipped.
8. **Git vs Dits comparison** — see §2.4.
9. **CTA** — Read the docs / Open the Playground.

### 2.3 About page rework (`apps/web/src/app/about/page.tsx`)

Refine, don't rebuild. Keep hero, mission, origin story, audiences, values, community, CTA.
Changes:

- **Move out** the deep "How Dits Works" 3-step section and the full tool-comparison table to
  `/how-it-works`. Leave a short teaser on About linking to it.
- **Add "What we're actually building"** — two honest columns: *Working today* vs
  *Roadmap (don't rely on these yet)*, sourced verbatim-in-spirit from README implementation
  status. Use `card` + `status-dot`/`badge`, redundant cues.
- **Add "Where Dits wins — and where it loses"** — the real benchmark scenarios A–D. Explicitly
  include the losing case (A) to make the wins credible. Numbers labeled as one-machine spike
  results with a link to `/benchmarks`.
- **Add "Open core vs Ditshub"** — concise two-card summary from README.
- **Trim** existing marketing-ish copy that asserts unproven stats (e.g. the invented
  "67% dedup / 412 GB saved" terminal block) → replace with the real numbers or mark clearly as
  an illustrative example.

### 2.4 Enhanced Git-vs-Dits comparison (lives on `/how-it-works`)

Evolve the existing 4-column table (`Dits · Git · Git LFS · Perforce`). Keep the structure and
the `CheckCircle2`/`XCircle` + note pattern (already AGENTS-compliant), but:

- Add an **honesty row / footnote**: generic chunking is *not* a universal win (scenario A);
  the differentiator is the format-aware/FACR layer (B/C/D).
- Add rows that reflect the real engine: *Format-aware (MP4 atom) handling*, *Frame-addressable
  video (FACR)*, *Convergent encryption (AES-256-GCM)*, *Hybrid Git+chunk storage*.
- Mark any Dits row that depends on unshipped transport as **Roadmap**.

Consider extracting the table into a small `@/components/diagrams` or page-local component since
it's reused conceptually, but a page-local table is acceptable (match existing About pattern).

### 2.5 Playground stub: `/playground` (`apps/web/src/app/playground/page.tsx`)

Phase-1 placeholder so the nav item works and sets expectations:

- Hero + "Coming soon: run the real Dits engine in your browser (WebAssembly)."
- Explain what it *will* do (drop a file → watch it chunk/hash/dedup live; edit → see reuse).
- Link to Docs and GitHub. Use brand styling; no fake interactivity.
- This page is replaced/filled in by Phase 2.

---

## 3. Data flow

All Phase-1 pages are static server components. The only dynamic data is the existing
client-side fetch of `/benchmarks/latest.json` via `BenchmarksHighlights` (reused as-is). No new
APIs, no new server code. Comparison/feature/benchmark content lives in typed `const` arrays at
the top of each page module (matching the current About page convention).

---

## 4. Error handling & edge cases

- `BenchmarksHighlights` already no-ops if the JSON is missing — keep that graceful fallback;
  pages must render fully without it.
- All external links: `target="_blank" rel="noopener noreferrer"` (existing convention).
- Honest-status content must never regress into asserting unshipped features as working.

## 5. Testing / verification

- `pnpm/npm --filter @byronwade/dits-web build` (or `next build`) passes — no type/lint errors.
- `next lint` clean.
- Manual: dev server — visit `/about`, `/how-it-works`, `/playground`; verify nav active states,
  mobile sheet includes new items, footer parity, skip-link target, keyboard focus rings,
  reduced-motion (no motion regressions), and that no color-only status cues were introduced.
- Cross-check every factual claim against README / `tmp/spike/RESULTS.md`; no invented numbers.

## 6. Out of scope (Phase 1)

- The real WASM engine and live Playground interactivity (Phase 2).
- Any change to the Rust core, CLI, or benchmark harness.
- New docs pages under `/docs/*` (those already exist).

---

## 7. Phase 2 (scoped, separate spec) — real-engine Playground via WASM

**Feasibility (confirmed by reading source):** `apps/cli/src/core/chunk.rs` and
`core/hash.rs` are pure compute. `chunk_data` / `chunk_data_with_refs` use only
`fastcdc::v2020` + BLAKE3 + `serde` (no filesystem, no async). The only non-portable code is the
**rayon** parallel variants (`*_parallel`) — `chunk.rs:12` `use rayon::prelude::*`.

**Architecture:**
- Extract `chunk.rs` + `hash.rs` (chunk's only intra-crate dep is `core::hash`; hash has none)
  into a new **`dits-core` leaf crate**. `apps/cli` depends on it → CLI and web share the *real*
  engine, with no restructuring of the production binary.
- `#[cfg(not(target_arch = "wasm32"))]`-gate the rayon parallel paths (don't merely leave them
  unexported — they must not compile for wasm32).
- New thin `dits-wasm` crate: `wasm-bindgen` wrapper exposing `chunk(bytes) -> chunks[]` (hash +
  offset + size). Build `wasm-pack build --target web`; output into `apps/web/public` or a
  `src/wasm` module.
- Playground UI: drop a real file (or edit text), run WASM, visualize chunks, BLAKE3 hashes,
  dedup, bytes-saved, and an "edit → re-chunk → see which chunks are reused" demo.

**Prerequisite spike (must pass before Phase-2 spec is finalized):** `wasm-pack` is **not
installed** and the `wasm32-unknown-unknown` target is **not added**. ~15-min throwaway spike:
new crate with `fastcdc` + `blake3` + `wasm-bindgen`, `wasm-pack build --target web`, hash one
buffer in the browser. Confirms (a) blake3 1.5.4 builds for wasm32 (feature flags?) and (b) the
toolchain pipeline works, before any architecture depends on it.

**Phase-2 risks:** wasm bundle size; blake3 wasm backend selection; keeping `dits-core` extract
byte-identical to current CLI behavior (golden test: same input → same chunk hashes pre/post
extraction).
