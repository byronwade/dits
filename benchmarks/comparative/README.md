# Comparative Benchmarks

Real, one-machine, reproducible comparison of dits against the tools people actually
use for large media — **git-lfs, restic, borg, xdelta3** — plus dits' own engine.
Every number on the website's `/benchmarks` page comes from here. Nothing is projected
or cited; if a number is shown, it was measured on one machine, or it isn't shown.

## What it measures

The universal metric is **store growth**: how many bytes a tool adds to its store when
you commit version 2 (an edited file) on top of an already-stored version 1. Same input
for every tool, measured the same way (`du` of the repo/store before/after).

Workloads (`workloads.mjs`):

| id | what it is | who it's honest about |
|----|------------|-----------------------|
| `reexport` | small edit, full NLE-style re-export | **dits-generic loses** — re-encode shifts every byte |
| `metadata` | rename / container tag change | CDC tools handle it well; dits marginally ahead |
| `facr-regrade` | re-color a few frames (FACR) | dits ~98% — frame-addressed dedup |
| `stream` | edit 2s of an HLS stream | dits re-ships ~1 of N segments |
| `trim` | non-destructive trim | dits **0 bytes** (manifest reference) |
| `photo` | non-destructive photo edit | dits **0 bytes** (edit log) |
| `grade-all` | whole-clip color grade | **everyone loses** ~0% — total rewrite |

Two extra series are produced by the **showcase** profile only:

- `cumulative` — 15 localized edits to one lossless clip; per-tool store growth over time.
- `scaling` — the same localized edit on clips of growing size; dedup % vs file size.

## Run it

From the repo root:

```bash
# 1. Build the dits binary (the comparative runners shell out to it)
npm run build:cli

# 2. Generate the deterministic test media (cached after first run)
benchmarks/comparative/media/gen-media.sh small     # CI-sized fixtures
# benchmarks/comparative/media/gen-media.sh full     # larger, for showcase

# 3a. CI profile — fast regression guard, asserts the dits FACR wins still hold
npm run bench:comparative

# 3b. Showcase profile — CI matrix PLUS the cumulative + scaling sweeps (slow, manual)
npm run bench:comparative:showcase

# Unit tests for the harness itself (schema / metrics / cost / runner contract)
npm run bench:comparative:test
```

## Profiles, and the footgun

| Profile | Produces | When to run |
|---------|----------|-------------|
| `ci` (`bench:comparative`) | matrix `records` only; empty `cumulative`/`scaling`; asserts FACR dedup thresholds | CI, quick local checks |
| `showcase` (`bench:comparative:showcase`) | matrix `records` **+** measured `cumulative` **+** measured `scaling` | on a reference machine; its output is what gets committed |

Both profiles write `latest.json` to **two** locations:

- `benchmarks/comparative/latest.json`
- `apps/web/public/benchmarks/comparative/latest.json` (what the website reads)

> **Footgun:** the published `latest.json` must come from a **showcase** run, because
> only showcase fills in `cumulative` and `scaling`. Running the **ci** profile and
> committing its output will blank the project-over-time (ch08) and scaling (ch09)
> charts. If you re-run benchmarks for a release, use `:showcase` and commit that.
>
> CI matrix refreshes on non-reference machines should write
> `benchmarks/comparative/ci-latest.json` (and the matching
> `apps/web/public/benchmarks/comparative/ci-latest.json` copy) and leave the
> showcase `latest.json` untouched.

## Tool requirements & graceful degradation

Needs: `ffmpeg`, the built `dits` binary, and `node`. Optional comparators: `git-lfs`,
`restic`, `borg`, `xdelta3`. A missing comparator is recorded as `available: false` and
skipped — the run never fails because a tool isn't installed, and the dits-only FACR
asserts still run. On macOS: `brew install restic borgbackup xdelta git-lfs`.

CI (`.github/workflows/ci.yml`, `benchmark` job) installs only ffmpeg + git-lfs, so the
CDC comparators are skipped there; the job still guards the harness unit tests, the
engine micro-benchmarks, and the dits FACR dedup asserts.

## Data contract

`schema.mjs` defines and validates each record (`validateRecord`). Shape:

```jsonc
{
  "workload": "facr-regrade", "workload_label": "Re-color a few frames",
  "tier": "dits", "tool": "dits-facr",
  "dataset": { "bytes": 0, "codec": "synthetic", "label": "FACR demo clip" },
  "metrics": { "stored_bytes": 0, "wire_bytes": 0, "wall_ms": 0,
               "peak_rss_bytes": null, "restore_ms": null, "dedup_pct": 98.3 },
  "derived": { "cost_storage_usd_yr": 0, "cost_egress_usd_per_1k": 0, "upload_seconds_at_line": 0 },
  "tool_version": "...", "run_timestamp": "...", "git_sha": "...",
  "machine": "...", "available": true
}
```

Cost assumptions live in `cost.mjs` (mirrored for display in
`apps/web/src/lib/bench-cost.ts`) and are shown inline on the page — no hidden math.

## Engine micro-benchmarks (separate)

The "engine throughput" section of the page is fed by a **different** harness:
`npm run bench` → `scripts/bench/run.mjs`, which runs `apps/cli/tests/benchmarks.rs`
(FastCDC / BLAKE3 / SHA-256 against the canonical engine) and writes
`benchmarks/latest.json` + `apps/web/public/benchmarks/latest.json`.

## Media

Generated once by `gen-media.sh` with deterministic ffmpeg sources, then sha256-pinned
in `media/manifest.json`. The blobs are git-ignored (`media/.gitignore`); regenerate
them with the script. ffmpeg is not bit-reproducible across versions, so content-defined
chunking is sensitive to byte-identical input — hence "generate once and cache."

## Honesty guardrails

- Same machine, same inputs, same metric; tool versions + machine recorded in `meta`.
- The workloads where dits **loses** (`reexport`, `grade-all`) are shown as first-class
  content, not buried — see chapter 02 and the methodology section on the page.
- The `append` workload was deliberately dropped: at small sizes per-tool store overhead
  made CDC tools look artificially bad, and the gap was fixture-fragile (a CDC-vs-CDC
  difference is noise, not a capability). Don't re-add it without realistic media.
