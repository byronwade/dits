# Benchmarks — Real Comparative Harness + Keynote Page (Design Spec)

*Status: draft 2026-06-02. Awaiting user review. Author: brainstorming session w/ measured spike.*

## Goal

Replace the stale, dits-only benchmark data with a **real, reproducible, one-machine
comparison** of dits against the tools people actually use (git-lfs, restic, borg, rsync,
xdelta3) — and present it on a new top-level **`/benchmarks`** page styled like an Apple
keynote: light, plain-English, percentage-forward, and **radically honest** (we show the
workloads where dits *loses*, on purpose).

The page's job is to make a non-technical viewer instantly understand *why format-awareness
matters*, while a skeptical engineer can drill into the full matrix and re-run every number
with one command.

## Why now / what's broken today

- The existing harness (`scripts/bench/run.mjs`, `npm run bench`) emits `DITS_BENCH:` JSON
  lines into `benchmarks/*.json` and a web copy under `apps/web/public/benchmarks/`. **But**
  the Rust suites (`dits-core`, `dits-chunker`) were quarantined to `legacy/` on 2026-06-02
  and are **skipped** — only the Node NPM-wrapper micro-benchmarks run. The published
  `latest.json` is dated 2025-12-14 and stale.
- There is **no cross-tool comparison data at all** today. The current `/docs/benchmarks`
  page shows only dits-internal numbers.

## The thesis, proven by a measured spike (2026-06-02, Apple M-series, one host)

Metric = **bytes added to each tool's store when versioning v2 (the edited file) on top of an
already-stored v1.** Identical inputs for every tool. Tools: git-lfs 3.7.1, restic 0.18.1,
borg 1.4.4, xdelta3 3.1.0, dits 0.1.0 (generic chunking + FACR frame store). Raw spike script
and results: `tmp/spike/run_spike.sh`, `tmp/spike/run_spike2.sh`, `tmp/spike/RESULTS.md`.

| Workload | Best generic tool | dits | Verdict |
|---|---|---|---|
| Small edit via **full re-export** (96 MB ProRes) | restic 70 MB / borg 73 / xdelta3 67 | dits-generic **88 MB** | **dits LOSES** — format-blind dedup is worthless on a re-export |
| **FACR frame re-grade** (5 of 300 frames) | re-stores all 300 | **5 frames, 98.3% dedup** | dits wins big |
| **Incremental HLS re-publish** (re-grade 2s) | full re-encode 3,501 KB | **471 KB, 1 of 6 segments** | dits wins, 7.4× / 86.5% |
| **Metadata-only change** (H.264, moov rewrite) | restic 0.77 MB / borg 5.93 MB | **0.19 MB** | dits beats CDC tier (xdelta3 0.00 wins but needs old copy local) |

**Conclusion that drives the whole page:** beating git-lfs is a strawman (it's not a delta
tool). The real contest is the CDC-dedup tier (restic/borg), and there dits' *generic* mode
ties-or-loses. dits' genuine, defensible edge is **format-awareness / FACR** — frame-level
dedup, incremental segment re-encode, structural awareness. The keynote is built around that,
and leads with the honest loss to earn credibility for the wins.

## Non-goals

- Not a live/interactive "run it in your browser" benchmark (possible Phase 3+ idea, out of
  scope here).
- Not CI-gated on multi-GB media — big-media numbers are produced manually and committed.
- No synthetic or cited competitor numbers. Every published number is measured by us on one
  machine, or it isn't shown.

---

## Architecture

Two halves joined by one contract (the data matrix). Three delivery phases.

### The data contract — `benchmarks/comparative/*.json` (pin first)

A flat **workload × tool × metric matrix**. One record per (workload, dataset, tool):

```jsonc
{
  "workload": "facr-regrade",          // stable id
  "workload_label": "Re-color a few frames",
  "tier": "dits" | "bleeding-edge" | "baseline" | "dits-generic",
  "tool": "dits-facr",                 // dits-facr | dits-generic | restic | borg | git-lfs | rsync | xdelta3
  "dataset": { "bytes": 100663296, "codec": "prores", "label": "100 MB ProRes" },
  "metrics": {
    "stored_bytes": 87000,
    "wire_bytes": 482000,              // null if N/A for the tool
    "wall_ms": 412,
    "peak_rss_bytes": 73400320,
    "restore_ms": 380,                 // null if not measured
    "dedup_pct": 98.3
  },
  "derived": {                          // computed by the page or harness, assumptions inline
    "cost_storage_usd_yr": 0.31,
    "cost_egress_usd_per_1k": 2.10,
    "upload_seconds_at_50mbps": 3.1
  },
  "tool_version": "restic 0.18.1",
  "run_timestamp": "2026-06-02T...Z",
  "git_sha": "...",
  "machine": "Apple M-series, macOS (recorded at run time)",
  "available": true                    // false => tool not installed; rendered as "n/a", never a win/loss
}
```

Two companion series files for the dramatic charts:

- `cumulative.json` — Module B. Per-tool store size after each of N commits:
  `{ tool, points: [{ edit: 0, total_bytes }, ... ] }`. Drives the diverging-lines chart.
- `scaling.json` — Module C. Per-tool dedup_pct at each dataset size:
  `{ tool, points: [{ dataset_bytes, dedup_pct }, ...] }`.

A top-level `meta` block records machine, OS, all tool versions, media spec hashes,
methodology URL, and the showcase-vs-CI profile that produced the file. These files are
copied to `apps/web/public/benchmarks/comparative/` (same pattern the existing runner uses).

The cost assumptions (S3 $/GB-mo, egress $/GB, line Mbps) live in one constants module shown
inline on the page — no hidden math.

### Harness — `benchmarks/comparative/` (Phase 1)

Small, single-purpose units:

- **`media/`** — deterministic fixtures generated **once** by `gen-media.sh` (ffmpeg:
  `testsrc2` source, fixed codec/params), then **hash-pinned and cached** (committed via
  Git LFS or a documented download, not regenerated per run — ffmpeg is not bit-reproducible
  and CDC is byte-sensitive). Variants: v1, v2-reexport, v2-meta, v2-trim, v2-append,
  v2-grade-all; at 100 MB / 1 GB / 4 GB.
- **`runners/<tool>.mjs`** — one per tool. Each exposes the same interface:
  `prepare()`, `storeV1(file)`, `storeV2(file) -> {stored_bytes, wall_ms, peak_rss}`,
  `restore() -> {restore_ms}`, `version()`, `available()`. **Universal metric = store growth
  in bytes** (du of the repo/store before/after), identical across tools. Time = wall clock;
  memory = `/usr/bin/time -l` max RSS. A missing tool → `available:false`, skipped, never
  fails the run.
- **dits runners are two:** `dits-generic` (init/add/commit, `.dits` growth via `repo-stats`)
  and `dits-facr` (facr-add / facr-trim / re-grade; stream-demo reports segment + byte counts
  for the streaming workload).
- **`workloads.mjs`** — declares each workload (id, label, tier expectations, which v2 fixture,
  which tools apply) and orchestrates: for each workload × dataset × available tool, run the
  runner, collect metrics, emit a matrix record.
- **`run.mjs`** — entrypoint. Two profiles:
  - `bench:comparative:ci` — smallest media, single dataset size, no cumulative/scaling
    sweeps. Fast, used as a regression guard. Asserts dits-facr still wins its wins.
  - `bench:comparative:showcase` — full media sizes + the 50-commit cumulative sweep + the
    scaling sweep. Run manually on the documented machine; its JSON is committed as the
    published numbers.
- **Restore the engine micro-benchmarks** (the quarantined `dits-core` / `dits-chunker`
  suites) into a path the runner can reach — either port them onto `apps/cli` or run them
  from `legacy/` explicitly — so BLAKE3/SHA/FastCDC/serialization numbers are real again and
  feed the "Engine throughput" module. (Investigate exact location in writing-plans.)

Wired into root `package.json` scripts alongside the existing `bench`.

### Page — `app/benchmarks/page.tsx` (Phase 2)

- **Nav:** add `{ title: "Benchmarks", href: "/benchmarks" }` to `navItems` in
  `apps/web/src/components/header.tsx`. Redirect `/docs/benchmarks` → `/benchmarks`
  (keep deep links alive).
- **Route:** server component loads `public/benchmarks/comparative/*.json` via a
  `lib/benchmarks.server.ts` extension; renders sections. No client fetch for first paint.
- **Visual language (approved mockup `keynote-light.html`):** light theme matching site
  tokens (`--brand` green, Geist fonts), percentage-forward, plain-English primary copy with
  jargon demoted to small "the technical bit" footnotes. Consistent labels: "Best tools today"
  / "Everyone else" / "dits".
- **Section order:**
  1. Hero — one big % ("87% less to upload & store"), one-line plain claim.
  2. Premise — the typo-in-a-400-page-book analogy.
  3. **The honest part** — the re-export workload where dits-generic loses (amber, up front).
  4. Frame-addressable (FACR) — 98% reused; two-bar 300→5.
  5. Streaming — 1 of 6 segments, 471 KB vs 3,501 KB, 86%.
  6. Structural/metadata — dits beats restic/borg.
  7. Engine throughput — BLAKE3 6× SHA-256, FastCDC MB/s, ops/s.
  8. **Module A** — money & time translation.
  9. **Module B** — cumulative-over-50-edits diverging-lines chart.
  10. **Module C** — scaling at 100 MB / 1 GB / 4 GB.
  11. **Module D** — full matrix, 5 metrics via tabs (storage / wire / time / memory / restore).
  12. **Module E** — more edit types incl. zero-byte trim & photo, honest full-grade loss.
  13. Methodology / reproduce — `npm run bench:comparative`, tool versions, machine, raw JSON links, CSV export.
- **Components:** reuse `components/benchmarks/{benchmark-comparison-chart,benchmark-table,
  benchmark-metric-card}` and `ui/chart`. Add keynote pieces, each small & isolated:
  `KeynoteSection` (scroll-reveal wrapper, respects `prefers-reduced-motion`), `CountUpStat`,
  `TwoTierBar` (plain "other vs dits" bar with % label), `CumulativeChart` (SVG area/line),
  `ScalingChart`, `MetricMatrix` (tabbed sortable table), `MoneyTimeCards`. Accessibility per
  the site's AGENTS.md rules (keyboard, focus rings, hit targets, reduced motion).

### Phasing

1. **Harness + data schema + the proven workloads** (re-export, facr-regrade, streaming,
   metadata) → produces real `comparative/latest.json` + `cumulative.json` + `scaling.json`.
   Schema pinned here; both halves depend on it.
2. **The keynote page** consuming that JSON — all 13 sections, all 5 modules, with the data
   that exists from Phase 1 (charts that need sweeps render from showcase JSON once available).
3. **Expand** — remaining workloads (append, trim, photo, grade-all, cold-restore), all
   dataset sizes, the full cumulative + scaling sweeps, CSV export, regression assertions.

## Honesty guardrails (binding)

- Same machine, same inputs, same metric, tool versions recorded, methodology published.
- No cherry-picking: the re-export loss and the full-grade loss are shown as first-class
  content, not buried.
- Projected numbers (e.g., the 50-edit cumulative before the showcase sweep is run) are
  labeled "projected from measured per-edit deltas" until the real sweep replaces them.
- Cost/time assumptions shown inline and adjustable in copy.

## Testing & verification

- Harness: a runner-contract test (each runner returns the required metric keys; missing tool
  → `available:false`, no crash). Snapshot the matrix shape against the schema. CI profile runs
  in reasonable time and asserts the known wins still hold (dits-facr regrade ≥ 95% dedup;
  streaming ≤ 1 re-encoded segment).
- Page: it renders from a committed fixture JSON (so the page builds without running the
  harness); a11y checks (keyboard nav, reduced motion); redirect from `/docs/benchmarks`.
- Numbers on the page must match the committed JSON exactly (no hand-typed values).

## Open questions for writing-plans

- Exact location/buildability of the quarantined engine benches (port vs run-from-legacy).
- Media fixture storage: Git LFS vs a `gen-media.sh` + checked-in hashes + download.
- rsync delta-size measurement method (openrsync batch vs treat xdelta3 as the binary-delta
  representative).
