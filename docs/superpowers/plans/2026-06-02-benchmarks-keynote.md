# Benchmarks Keynote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real, one-machine comparative benchmark harness (dits vs git-lfs/restic/borg/xdelta3) and a light, plain-English, percentage-forward keynote page at top-level `/benchmarks`.

**Architecture:** A Node harness in `benchmarks/comparative/` runs each tool through the same `store v1 → store v2 → measure` interface, emitting a `workload × tool × metric` JSON matrix (+ cumulative & scaling series). A Next.js server component at `app/benchmarks/page.tsx` reads that JSON and renders keynote sections. The JSON schema is the contract between the two halves.

**Tech Stack:** Node ESM + `node --test` (harness, matching existing `scripts/bench/`), Bash + ffmpeg (deterministic media), Next.js App Router + Tailwind/shadcn + Geist (page). External tools: git-lfs 3.7.1, restic 0.18.1, borg 1.4.4, xdelta3 3.1.0.

**Reference spec:** `docs/superpowers/specs/2026-06-02-benchmarks-keynote-design.md`
**Measured spike (source of truth for numbers/labels):** `tmp/spike/RESULTS.md`

---

## File Structure

**Phase 1 — Harness (`benchmarks/comparative/`)**
- `schema.mjs` — matrix record shape + `validateRecord()` (single responsibility: the contract)
- `metrics.mjs` — `dirSizeBytes()`, `timed()`, `withMaxRss()`, `pct()` helpers
- `cost.mjs` — `ASSUMPTIONS` + `derive(metrics)` → storage/egress $, upload seconds
- `media/gen-media.sh` — deterministic ffmpeg fixtures + `media/manifest.json` (sha256 pins)
- `runners/contract.mjs` — runner interface doc + `runRunner()` wrapper that normalizes output
- `runners/{gitlfs,restic,borg,xdelta3,ditsGeneric,ditsFacr}.mjs` — one tool each
- `workloads.mjs` — workload declarations (id, label, tier, v2 fixture, applicable tools)
- `run.mjs` — orchestrator; `--profile ci|showcase`; writes `latest.json`/`cumulative.json`/`scaling.json` to `benchmarks/comparative/` and copies to `apps/web/public/benchmarks/comparative/`
- `test/*.test.mjs` — node:test for `schema`, `metrics`, `cost`, runner-contract

**Phase 2 — Page (`apps/web/src/`)**
- `lib/comparative-types.ts` — TS types mirroring `schema.mjs`
- `lib/benchmarks.server.ts` — extend with `loadComparative()`
- `lib/bench-cost.ts` — cost assumptions for display (mirror of `cost.mjs`)
- `components/header.tsx` — add Benchmarks nav item (modify)
- `app/benchmarks/page.tsx` — server component, the keynote
- `app/docs/benchmarks/page.tsx` — replace body with redirect (modify)
- `components/benchmarks/keynote/` — `keynote-section.tsx`, `count-up-stat.tsx`, `two-tier-bar.tsx`, `cumulative-chart.tsx`, `scaling-chart.tsx`, `metric-matrix.tsx`, `money-time-cards.tsx`
- `public/benchmarks/comparative/*.json` — committed published data (output of Phase 1 showcase)

---

# PHASE 1 — HARNESS

### Task 1: Data contract — `schema.mjs` + validator

**Files:**
- Create: `benchmarks/comparative/schema.mjs`
- Test: `benchmarks/comparative/test/schema.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// benchmarks/comparative/test/schema.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { TIERS, TOOLS, validateRecord } from "../schema.mjs";

test("valid record passes", () => {
  const rec = {
    workload: "facr-regrade", workload_label: "Re-color a few frames",
    tier: "dits", tool: "dits-facr",
    dataset: { bytes: 100663296, codec: "prores", label: "100 MB ProRes" },
    metrics: { stored_bytes: 87000, wire_bytes: null, wall_ms: 412, peak_rss_bytes: 73400320, restore_ms: null, dedup_pct: 98.3 },
    tool_version: "dits 0.1.0", run_timestamp: "2026-06-02T00:00:00Z",
    git_sha: "abc", machine: "M-series", available: true,
  };
  assert.equal(validateRecord(rec).ok, true);
});

test("unknown tier fails", () => {
  const bad = { workload: "x", workload_label: "x", tier: "nope", tool: "restic",
    dataset: { bytes: 1, codec: "h264", label: "x" },
    metrics: { stored_bytes: 1, wire_bytes: null, wall_ms: 1, peak_rss_bytes: 1, restore_ms: null, dedup_pct: 0 },
    tool_version: "x", run_timestamp: "x", git_sha: "x", machine: "x", available: true };
  assert.equal(validateRecord(bad).ok, false);
});

test("missing metric key fails", () => {
  const bad = { workload: "x", workload_label: "x", tier: "dits", tool: "dits-facr",
    dataset: { bytes: 1, codec: "h264", label: "x" },
    metrics: { stored_bytes: 1 }, tool_version: "x", run_timestamp: "x",
    git_sha: "x", machine: "x", available: true };
  assert.equal(validateRecord(bad).ok, false);
});

assert.ok(TIERS.includes("bleeding-edge") && TOOLS.includes("restic"));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test benchmarks/comparative/test/schema.test.mjs`
Expected: FAIL — "Cannot find module '../schema.mjs'".

- [ ] **Step 3: Write `schema.mjs`**

```js
// benchmarks/comparative/schema.mjs
export const TIERS = ["baseline", "bleeding-edge", "dits", "dits-generic"];
export const TOOLS = ["git-lfs", "restic", "borg", "rsync", "xdelta3", "dits-generic", "dits-facr"];
export const METRIC_KEYS = ["stored_bytes", "wire_bytes", "wall_ms", "peak_rss_bytes", "restore_ms", "dedup_pct"];

export function validateRecord(rec) {
  const errors = [];
  const need = ["workload", "workload_label", "tier", "tool", "dataset", "metrics",
    "tool_version", "run_timestamp", "git_sha", "machine", "available"];
  for (const k of need) if (!(k in rec)) errors.push(`missing ${k}`);
  if (rec.tier && !TIERS.includes(rec.tier)) errors.push(`bad tier ${rec.tier}`);
  if (rec.tool && !TOOLS.includes(rec.tool)) errors.push(`bad tool ${rec.tool}`);
  if (rec.dataset && (typeof rec.dataset.bytes !== "number")) errors.push("dataset.bytes");
  if (rec.metrics) {
    for (const k of METRIC_KEYS) if (!(k in rec.metrics)) errors.push(`metrics.${k} missing`);
  } else errors.push("metrics missing");
  return { ok: errors.length === 0, errors };
}

// Series record builders (cumulative + scaling) share the matrix's tool/tier vocabulary.
export function emptyDoc(meta) {
  return { meta, records: [], cumulative: [], scaling: [] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test benchmarks/comparative/test/schema.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add benchmarks/comparative/schema.mjs benchmarks/comparative/test/schema.test.mjs
git commit -m "feat(bench): comparative matrix schema + validator"
```

---

### Task 2: Metric helpers — `metrics.mjs`

**Files:**
- Create: `benchmarks/comparative/metrics.mjs`
- Test: `benchmarks/comparative/test/metrics.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// benchmarks/comparative/test/metrics.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { dirSizeBytes, timed, pct } from "../metrics.mjs";

test("pct computes savings vs baseline", () => {
  assert.equal(pct(100, 12), 88);            // baseline 100, used 12 => 88% saved
  assert.equal(pct(0, 0), 0);
});

test("dirSizeBytes sums file sizes", () => {
  const d = mkdtempSync(path.join(tmpdir(), "mtest-"));
  writeFileSync(path.join(d, "a"), Buffer.alloc(1000));
  writeFileSync(path.join(d, "b"), Buffer.alloc(2000));
  assert.ok(dirSizeBytes(d) >= 3000);
});

test("timed returns ms and value", async () => {
  const { ms, value } = await timed(async () => 42);
  assert.equal(value, 42);
  assert.ok(ms >= 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test benchmarks/comparative/test/metrics.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `metrics.mjs`**

```js
// benchmarks/comparative/metrics.mjs
import { spawnSync } from "node:child_process";
import { statSync, readdirSync } from "node:fs";
import path from "node:path";

export function dirSizeBytes(dir) {
  let total = 0;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) total += dirSizeBytes(p);
    else { try { total += statSync(p).size; } catch {} }
  }
  return total;
}

export async function timed(fn) {
  const t0 = process.hrtime.bigint();
  const value = await fn();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { ms, value };
}

// Run a command under /usr/bin/time -l and parse "maximum resident set size" (bytes on macOS).
export function withMaxRss(cmd, args, opts = {}) {
  const r = spawnSync("/usr/bin/time", ["-l", cmd, ...args],
    { encoding: "utf8", cwd: opts.cwd, env: opts.env ?? process.env });
  const m = (r.stderr || "").match(/(\d+)\s+maximum resident set size/);
  return { peak_rss_bytes: m ? Number(m[1]) : null, status: r.status, stdout: r.stdout, stderr: r.stderr };
}

export function pct(baseline, used) {
  if (!baseline || baseline <= 0) return 0;
  return Math.max(0, Math.round((1 - used / baseline) * 1000) / 10);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test benchmarks/comparative/test/metrics.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add benchmarks/comparative/metrics.mjs benchmarks/comparative/test/metrics.test.mjs
git commit -m "feat(bench): metric helpers (dir size, timing, max-rss, pct)"
```

---

### Task 3: Cost translation — `cost.mjs` (Module A math)

**Files:**
- Create: `benchmarks/comparative/cost.mjs`
- Test: `benchmarks/comparative/test/cost.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// benchmarks/comparative/test/cost.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { ASSUMPTIONS, derive } from "../cost.mjs";

test("derive converts bytes to $ and seconds", () => {
  const d = derive({ stored_bytes: 1_073_741_824, wire_bytes: 1_073_741_824 }); // 1 GiB
  // storage: 1 GB * $/GB-mo * 12
  assert.ok(d.cost_storage_usd_yr > 0);
  assert.ok(d.upload_seconds_at_line > 0);
  assert.equal(typeof d.cost_egress_usd_per_1k, "number");
});

test("assumptions are visible constants", () => {
  assert.ok(ASSUMPTIONS.storage_usd_per_gb_mo > 0);
  assert.ok(ASSUMPTIONS.line_mbps > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test benchmarks/comparative/test/cost.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `cost.mjs`**

```js
// benchmarks/comparative/cost.mjs
// All assumptions are explicit and surfaced on the page. No hidden math.
export const ASSUMPTIONS = {
  storage_usd_per_gb_mo: 0.023,   // S3 Standard
  egress_usd_per_gb: 0.09,        // S3 egress
  line_mbps: 50,                  // typical upload line
};

const GB = 1_073_741_824;

export function derive(metrics, a = ASSUMPTIONS) {
  const storedGb = (metrics.stored_bytes ?? 0) / GB;
  const wireGb = (metrics.wire_bytes ?? metrics.stored_bytes ?? 0) / GB;
  return {
    cost_storage_usd_yr: round(storedGb * a.storage_usd_per_gb_mo * 12, 2),
    cost_egress_usd_per_1k: round(wireGb * a.egress_usd_per_gb * 1000, 2),
    upload_seconds_at_line: round((wireGb * 8 * 1024) / a.line_mbps, 1), // GB→Mb / Mbps
  };
}

function round(n, d) { const f = 10 ** d; return Math.round(n * f) / f; }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test benchmarks/comparative/test/cost.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add benchmarks/comparative/cost.mjs benchmarks/comparative/test/cost.test.mjs
git commit -m "feat(bench): cost/time translation with explicit assumptions"
```

---

### Task 4: Deterministic media — `gen-media.sh` + manifest

**Files:**
- Create: `benchmarks/comparative/media/gen-media.sh`
- Create (generated): `benchmarks/comparative/media/manifest.json`

- [ ] **Step 1: Write the script**

```bash
#!/bin/bash
# Deterministic-as-possible fixtures. ffmpeg is NOT bit-reproducible, so we generate
# ONCE, sha256-pin in manifest.json, and cache. Re-running only regenerates if missing.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
SIZE="${1:-small}"   # small | full
case "$SIZE" in
  small) DUR=8 ;;    # ~ tens of MB, CI profile
  full)  DUR=20 ;;   # showcase profile
esac
gen () { # $1 outfile  $2 ffmpeg-args...
  local out="$DIR/$1"; shift
  [ -f "$out" ] && { echo "cached $out"; return; }
  ffmpeg -y -v error -f lavfi -i "testsrc2=size=1280x720:rate=30:duration=$DUR" "$@" "$out"
}
# v1 + variants (ProRes intra-frame for frame work; H.264 for metadata)
gen v1.mov        -c:v prores_ks -profile:v 2
gen v1.mp4        -c:v libx264 -preset medium -g 60 -pix_fmt yuv420p
# v2: full re-export with a brightness bump on the 8-10s window (the honest-loss case)
[ -f "$DIR/v2_reexport.mov" ] || ffmpeg -y -v error -i "$DIR/v1.mov" \
  -vf "eq=brightness=0.30:enable='between(t,8,10)'" -c:v prores_ks -profile:v 2 "$DIR/v2_reexport.mov"
# v2: metadata-only change (mdat identical)
[ -f "$DIR/v2_meta.mp4" ] || ffmpeg -y -v error -i "$DIR/v1.mp4" -c copy \
  -metadata title="Color Pass 2" -movflags +faststart "$DIR/v2_meta.mp4"
# pin hashes
( cd "$DIR" && for f in v1.mov v1.mp4 v2_reexport.mov v2_meta.mp4; do
    printf '%s  %s\n' "$(shasum -a 256 "$f" | cut -d" " -f1)" "$f"; done > checksums.txt )
node "$DIR/../mk-manifest.mjs" "$DIR"
echo "media ready in $DIR"
```

- [ ] **Step 2: Write `mk-manifest.mjs`** (turns checksums.txt into manifest.json)

```js
// benchmarks/comparative/mk-manifest.mjs
import { readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
const dir = process.argv[2];
const lines = readFileSync(path.join(dir, "checksums.txt"), "utf8").trim().split("\n");
const files = lines.map((l) => { const [sha, name] = l.split(/\s+/); 
  return { name, sha256: sha, bytes: statSync(path.join(dir, name)).size }; });
writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ files }, null, 2) + "\n");
console.log("wrote manifest.json with", files.length, "files");
```

- [ ] **Step 3: Generate and verify**

Run: `chmod +x benchmarks/comparative/media/gen-media.sh && benchmarks/comparative/media/gen-media.sh small`
Expected: prints "media ready"; `benchmarks/comparative/media/manifest.json` lists 4 files with sha256 + bytes.

- [ ] **Step 4: Gitignore the media blobs, commit the scripts + manifest**

Add to `benchmarks/comparative/media/.gitignore`:
```
*.mov
*.mp4
checksums.txt
```

```bash
git add benchmarks/comparative/media/gen-media.sh benchmarks/comparative/mk-manifest.mjs \
  benchmarks/comparative/media/manifest.json benchmarks/comparative/media/.gitignore
git commit -m "feat(bench): deterministic media generator + hash-pinned manifest"
```

---

### Task 5: Runners — one module per tool (universal store-growth metric)

**Files:**
- Create: `benchmarks/comparative/runners/contract.mjs`
- Create: `benchmarks/comparative/runners/{gitlfs,restic,borg,xdelta3,ditsGeneric,ditsFacr}.mjs`
- Test: `benchmarks/comparative/test/runner-contract.test.mjs`

Each runner exports `{ tool, tier, available(), run({ v1, v2, workdir }) }`.
`run()` returns `{ stored_bytes, wire_bytes, wall_ms, peak_rss_bytes, restore_ms, dedup_pct }`.
Universal metric: store size after v2 minus store size after v1.

- [ ] **Step 1: Write the contract test (uses a fake runner)**

```js
// benchmarks/comparative/test/runner-contract.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { METRIC_KEYS } from "../schema.mjs";
const fake = { tool: "dits-facr", tier: "dits", available: () => true,
  async run() { return { stored_bytes: 5, wire_bytes: null, wall_ms: 1, peak_rss_bytes: 10, restore_ms: null, dedup_pct: 98.3 }; } };
test("runner output has every metric key", async () => {
  const out = await fake.run();
  for (const k of METRIC_KEYS) assert.ok(k in out, `missing ${k}`);
});
```

- [ ] **Step 2: Run → expect PASS** (it tests the contract, fake satisfies it)

Run: `node --test benchmarks/comparative/test/runner-contract.test.mjs`
Expected: PASS. (This pins the interface every real runner must satisfy.)

- [ ] **Step 3: Write `contract.mjs`** (shared helpers + availability check)

```js
// benchmarks/comparative/runners/contract.mjs
import { spawnSync } from "node:child_process";
export function has(bin) {
  return spawnSync("command", ["-v", bin], { shell: true }).status === 0
    || spawnSync(bin, ["--version"], { stdio: "ignore" }).status === 0;
}
export function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", cwd: opts.cwd, env: opts.env ?? process.env });
  if (r.status !== 0 && !opts.allowFail) throw new Error(`${cmd} ${args.join(" ")} -> ${r.status}\n${r.stderr}`);
  return r;
}
export const DITS = process.env.DITS_BIN
  || new URL("../../../target/release/dits", import.meta.url).pathname;
```

- [ ] **Step 4: Write `restic.mjs`** (the canonical bleeding-edge runner; others mirror it)

```js
// benchmarks/comparative/runners/restic.mjs
import { mkdtempSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { has, sh } from "./contract.mjs";
import { dirSizeBytes, timed, pct } from "../metrics.mjs";

export const tool = "restic", tier = "bleeding-edge";
export const available = () => has("restic");

export async function run({ v1, v2 }) {
  const repo = mkdtempSync(path.join(tmpdir(), "restic-"));
  const env = { ...process.env, RESTIC_PASSWORD: "x", RESTIC_REPOSITORY: repo };
  sh("restic", ["init", "-q"], { env });
  sh("restic", ["backup", "-q", v1], { env });
  const s1 = dirSizeBytes(repo);
  const { ms } = await timed(async () => sh("restic", ["backup", "-q", v2], { env }));
  const s2 = dirSizeBytes(repo);
  const fileBytes = (await import("node:fs")).statSync(v2).size;
  const stored = s2 - s1;
  return { stored_bytes: stored, wire_bytes: stored, wall_ms: ms,
    peak_rss_bytes: null, restore_ms: null, dedup_pct: pct(fileBytes, stored) };
}
```

- [ ] **Step 5: Write `borg.mjs`**

```js
// benchmarks/comparative/runners/borg.mjs
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { has, sh } from "./contract.mjs";
import { dirSizeBytes, timed, pct } from "../metrics.mjs";
export const tool = "borg", tier = "bleeding-edge";
export const available = () => has("borg");
export async function run({ v1, v2 }) {
  const repo = path.join(mkdtempSync(path.join(tmpdir(), "borg-")), "r");
  const env = { ...process.env, BORG_PASSPHRASE: "x" };
  sh("borg", ["init", "-e", "repokey", repo], { env });
  sh("borg", ["create", `${repo}::v1`, v1], { env });
  const s1 = dirSizeBytes(repo);
  const { ms } = await timed(async () => sh("borg", ["create", `${repo}::v2`, v2], { env }));
  const stored = dirSizeBytes(repo) - s1;
  return { stored_bytes: stored, wire_bytes: stored, wall_ms: ms,
    peak_rss_bytes: null, restore_ms: null, dedup_pct: pct(statSync(v2).size, stored) };
}
```

- [ ] **Step 6: Write `gitlfs.mjs`**

```js
// benchmarks/comparative/runners/gitlfs.mjs
import { mkdtempSync, copyFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { has, sh } from "./contract.mjs";
import { dirSizeBytes, timed, pct } from "../metrics.mjs";
export const tool = "git-lfs", tier = "baseline";
export const available = () => has("git-lfs");
export async function run({ v1, v2 }) {
  const repo = mkdtempSync(path.join(tmpdir(), "glfs-"));
  const g = (...a) => sh("git", ["-C", repo, "-c", "user.email=a@b.c", "-c", "user.name=x", ...a]);
  sh("git", ["init", "-q", repo]);
  sh("git", ["-C", repo, "lfs", "install", "--local"], { allowFail: true });
  sh("git", ["-C", repo, "lfs", "track", "*.bin"], { allowFail: true });
  g("add", "."); g("commit", "-qm", "init");
  copyFileSync(v1, path.join(repo, "asset.bin")); g("add", "asset.bin"); g("commit", "-qm", "v1");
  const s1 = dirSizeBytes(path.join(repo, ".git"));
  const { ms } = await timed(async () => {
    copyFileSync(v2, path.join(repo, "asset.bin")); g("add", "asset.bin"); g("commit", "-qm", "v2"); });
  const stored = dirSizeBytes(path.join(repo, ".git")) - s1;
  return { stored_bytes: stored, wire_bytes: stored, wall_ms: ms,
    peak_rss_bytes: null, restore_ms: null, dedup_pct: pct(statSync(v2).size, stored) };
}
```

- [ ] **Step 7: Write `xdelta3.mjs`**

```js
// benchmarks/comparative/runners/xdelta3.mjs
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { has, sh } from "./contract.mjs";
import { timed, pct } from "../metrics.mjs";
export const tool = "xdelta3", tier = "bleeding-edge";
export const available = () => has("xdelta3");
export async function run({ v1, v2 }) {
  const out = path.join(mkdtempSync(path.join(tmpdir(), "xd-")), "patch");
  const { ms } = await timed(async () => sh("xdelta3", ["-e", "-9", "-s", v1, v2, out]));
  const stored = statSync(out).size;
  return { stored_bytes: stored, wire_bytes: stored, wall_ms: ms,
    peak_rss_bytes: null, restore_ms: null, dedup_pct: pct(statSync(v2).size, stored) };
}
```

- [ ] **Step 8: Write `ditsGeneric.mjs`** (the honest-loss runner)

```js
// benchmarks/comparative/runners/ditsGeneric.mjs
import { mkdtempSync, copyFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { has, sh, DITS } from "./contract.mjs";
import { dirSizeBytes, timed, pct } from "../metrics.mjs";
export const tool = "dits-generic", tier = "dits-generic";
export const available = () => has(DITS);
export async function run({ v1, v2 }) {
  const repo = mkdtempSync(path.join(tmpdir(), "ditsg-"));
  const d = (...a) => sh(DITS, a, { cwd: repo, allowFail: true });
  d("init");
  copyFileSync(v1, path.join(repo, "asset.bin")); d("add", "asset.bin"); d("commit", "-m", "v1");
  const s1 = dirSizeBytes(path.join(repo, ".dits"));
  const { ms } = await timed(async () => {
    copyFileSync(v2, path.join(repo, "asset.bin")); d("add", "asset.bin"); d("commit", "-m", "v2"); });
  const stored = dirSizeBytes(path.join(repo, ".dits")) - s1;
  return { stored_bytes: stored, wire_bytes: stored, wall_ms: ms,
    peak_rss_bytes: null, restore_ms: null, dedup_pct: pct(statSync(v2).size, stored) };
}
```

- [ ] **Step 9: Write `ditsFacr.mjs`** (parses dits' own stored-frame report)

```js
// benchmarks/comparative/runners/ditsFacr.mjs
import { has, sh, DITS } from "./contract.mjs";
import { timed } from "../metrics.mjs";
export const tool = "dits-facr", tier = "dits";
export const available = () => has(DITS);
// Uses the built-in facr-demo / stream-demo proofs that report stored frames + bytes.
// workload "facr-regrade": parse "v2 NEW frames : N" and "dedup fraction : P%".
// workload "stream": parse "re-delivered : X KB (naive ... : Y KB)".
export async function run({ workload }) {
  if (workload === "stream") {
    const { ms, value } = await timed(async () =>
      sh(DITS, ["stream-demo", "--grade-start", "4", "--grade-end", "6",
        "--segment-seconds", "2", "--port", "0"], { allowFail: true }).stdout);
    const re = value.match(/re-delivered\s*:\s*([\d.]+)\s*KB.*?:\s*([\d.]+)\s*KB/s);
    const shipped = re ? Number(re[1]) * 1024 : null, naive = re ? Number(re[2]) * 1024 : null;
    const dedup = re ? Math.round((1 - shipped / naive) * 1000) / 10 : null;
    return { stored_bytes: shipped, wire_bytes: shipped, wall_ms: ms, peak_rss_bytes: null, restore_ms: null, dedup_pct: dedup };
  }
  // default: facr-regrade
  const { ms, value } = await timed(async () =>
    sh(DITS, ["facr-demo", "--frames", "300", "--regrade", "5"]).stdout);
  const nf = value.match(/v2 NEW frames\s*:\s*(\d+)/);
  const df = value.match(/dedup fraction\s*:\s*([\d.]+)%/);
  const newFrames = nf ? Number(nf[1]) : null;
  // stored bytes ≈ newFrames * avg frame bytes; FACR demo prints totals — store dedup_pct as the headline.
  return { stored_bytes: null, wire_bytes: null, wall_ms: ms, peak_rss_bytes: null,
    restore_ms: null, dedup_pct: df ? Number(df[1]) : null };
}
```
> Note for executor: confirm the exact `stream-demo` flag for "don't serve" — if `--port 0` still blocks, wrap in a `timeout`-style kill after the byte report prints (spike used `timeout 90`). The parse regexes above match the spike's real output in `tmp/spike/RESULTS.md`.

- [ ] **Step 10: Run the contract test again + a live smoke**

Run: `node --test benchmarks/comparative/test/runner-contract.test.mjs`
Expected: PASS.
Run (smoke, needs media + dits built): `node -e "import('./benchmarks/comparative/runners/restic.mjs').then(async m=>console.log(await m.run({v1:'benchmarks/comparative/media/v1.mp4',v2:'benchmarks/comparative/media/v2_meta.mp4'})))"`
Expected: prints an object with all 6 metric keys, `dedup_pct` > 0.

- [ ] **Step 11: Commit**

```bash
git add benchmarks/comparative/runners benchmarks/comparative/test/runner-contract.test.mjs
git commit -m "feat(bench): per-tool runners with universal store-growth metric"
```

---

### Task 6: Workloads + orchestrator — `workloads.mjs`, `run.mjs`

**Files:**
- Create: `benchmarks/comparative/workloads.mjs`
- Create: `benchmarks/comparative/run.mjs`
- Modify: `package.json` (root) — add scripts

- [ ] **Step 1: Write `workloads.mjs`**

```js
// benchmarks/comparative/workloads.mjs
// Each workload: which v2 fixture, which tools apply. Tier expectations drive CI asserts.
export const WORKLOADS = [
  { id: "reexport", label: "Re-export a finished clip",
    v1: "v1.mov", v2: "v2_reexport.mov",
    tools: ["git-lfs", "restic", "borg", "xdelta3", "dits-generic"], honestLoss: true },
  { id: "metadata", label: "Rename / metadata fix",
    v1: "v1.mp4", v2: "v2_meta.mp4",
    tools: ["restic", "borg", "xdelta3", "dits-generic"] },
  { id: "facr-regrade", label: "Re-color a few frames",
    facr: true, tools: ["dits-facr"], minDedup: 95 },
  { id: "stream", label: "Edit 2s of a stream",
    facr: true, tools: ["dits-facr"], minDedup: 80 },
];
```

- [ ] **Step 2: Write `run.mjs`**

```js
// benchmarks/comparative/run.mjs
import { writeFileSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { WORKLOADS } from "./workloads.mjs";
import { validateRecord, emptyDoc } from "./schema.mjs";
import { derive } from "./cost.mjs";

const HERE = new URL(".", import.meta.url).pathname;
const MEDIA = path.join(HERE, "media");
const ROOT = path.resolve(HERE, "..", "..");
const profile = process.argv.includes("--profile")
  ? process.argv[process.argv.indexOf("--profile") + 1] : "ci";

const runners = Object.fromEntries(await Promise.all(
  ["gitlfs", "restic", "borg", "xdelta3", "ditsGeneric", "ditsFacr"].map(async (n) =>
    [n, await import(`./runners/${n}.mjs`)])));
const byTool = Object.fromEntries(Object.values(runners).map((r) => [r.tool, r]));

const git = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const meta = { profile, generated_at: new Date().toISOString(), git_sha: git,
  machine: `${os.platform()} ${os.arch()} ${os.cpus()?.[0]?.model ?? ""}`.trim(),
  assumptions_url: "/benchmarks#methodology",
  tool_versions: Object.fromEntries(Object.values(byTool).map((r) =>
    [r.tool, r.available() ? "present" : "n/a"])) };
const doc = emptyDoc(meta);

for (const w of WORKLOADS) {
  for (const toolName of w.tools) {
    const r = byTool[toolName];
    if (!r) continue;
    const available = r.available();
    let metrics = { stored_bytes: null, wire_bytes: null, wall_ms: null, peak_rss_bytes: null, restore_ms: null, dedup_pct: null };
    if (available) {
      const args = w.facr ? { workload: w.id }
        : { v1: path.join(MEDIA, w.v1), v2: path.join(MEDIA, w.v2) };
      try { metrics = await r.run(args); } catch (e) { console.error(`${toolName}/${w.id}:`, e.message); }
    }
    const ds = w.facr ? { bytes: 0, codec: "synthetic", label: "FACR demo clip" }
      : { bytes: statSync(path.join(MEDIA, w.v2)).size, codec: w.v2.endsWith(".mov") ? "prores" : "h264", label: w.label };
    const rec = { workload: w.id, workload_label: w.label, tier: r.tier, tool: r.tool,
      dataset: ds, metrics, derived: derive(metrics),
      tool_version: r.tool, run_timestamp: meta.generated_at, git_sha: git,
      machine: meta.machine, available };
    const v = validateRecord(rec);
    if (!v.ok) { console.error("invalid record", w.id, toolName, v.errors); process.exitCode = 1; }
    doc.records.push(rec);
  }
}

// CI asserts: known wins must hold.
if (profile === "ci") {
  for (const w of WORKLOADS.filter((x) => x.minDedup)) {
    const rec = doc.records.find((r) => r.workload === w.id && r.available);
    if (rec && rec.metrics.dedup_pct != null && rec.metrics.dedup_pct < w.minDedup) {
      console.error(`REGRESSION: ${w.id} dedup ${rec.metrics.dedup_pct}% < ${w.minDedup}%`);
      process.exitCode = 1;
    }
  }
}

for (const out of [path.join(HERE, "latest.json"),
  path.join(ROOT, "apps", "web", "public", "benchmarks", "comparative", "latest.json")]) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");
}
console.log(`wrote ${doc.records.length} records (profile=${profile})`);
```

- [ ] **Step 3: Add root `package.json` scripts**

```json
"bench:comparative": "node benchmarks/comparative/run.mjs --profile ci",
"bench:comparative:showcase": "node benchmarks/comparative/run.mjs --profile showcase",
"bench:comparative:test": "node --test benchmarks/comparative/test/"
```

- [ ] **Step 4: Run it end to end**

Run: `npm run build:cli && benchmarks/comparative/media/gen-media.sh small && npm run bench:comparative`
Expected: "wrote N records (profile=ci)"; `benchmarks/comparative/latest.json` and `apps/web/public/benchmarks/comparative/latest.json` exist; restic/borg/xdelta3/dits records present; facr-regrade dedup ≥ 95.

- [ ] **Step 5: Commit (data file too — it's the published numbers)**

```bash
git add benchmarks/comparative/workloads.mjs benchmarks/comparative/run.mjs package.json \
  benchmarks/comparative/latest.json apps/web/public/benchmarks/comparative/latest.json
git commit -m "feat(bench): comparative orchestrator + first real matrix data"
```

---

### Task 7: Cumulative + scaling sweeps (showcase profile)

**Files:**
- Modify: `benchmarks/comparative/run.mjs` (add sweeps when `profile==="showcase"`)

- [ ] **Step 1: Add the cumulative sweep** — after the records loop, when `profile==="showcase"`, run the `reexport`/`metadata` workload N times per tool accumulating store size, pushing `{ tool, points: [{edit, total_bytes}] }` into `doc.cumulative`. Scaling: re-run at media `full` sizes, pushing `{ tool, points: [{dataset_bytes, dedup_pct}] }` into `doc.scaling`.

```js
// append inside run.mjs, guarded by profile === "showcase"
if (profile === "showcase") {
  const N = 50;
  for (const toolName of ["git-lfs", "restic", "dits-generic"]) {
    const r = byTool[toolName]; if (!r?.available()) continue;
    const points = []; let total = 0;
    for (let i = 1; i <= N; i++) {
      const m = await r.run({ v1: path.join(MEDIA, "v1.mov"), v2: path.join(MEDIA, "v2_reexport.mov") });
      total += (m.stored_bytes ?? 0); points.push({ edit: i, total_bytes: total });
    }
    doc.cumulative.push({ tool: r.tool, points });
  }
  // scaling: requires media regenerated at multiple sizes (documented manual step)
}
```
> The 50-commit sweep is slow and intentionally manual. Document in `benchmarks/comparative/README.md` that showcase numbers are produced on the reference machine and committed.

- [ ] **Step 2: Write `benchmarks/comparative/README.md`** documenting both profiles, the reference machine, and "how to reproduce."

- [ ] **Step 3: Run showcase once, commit outputs**

Run: `benchmarks/comparative/media/gen-media.sh full && npm run bench:comparative:showcase`
Expected: `latest.json` now has non-empty `cumulative`.

- [ ] **Step 4: Commit**

```bash
git add benchmarks/comparative/run.mjs benchmarks/comparative/README.md \
  benchmarks/comparative/latest.json apps/web/public/benchmarks/comparative/latest.json
git commit -m "feat(bench): cumulative-over-N-edits sweep + reproduce docs"
```

---

### Task 8: Restore engine micro-benchmarks (Engine module data)

**Files:**
- Investigate: `legacy/backend-crates/**` (the quarantined `dits-core`/`dits-chunker` benches)
- Modify: `scripts/bench/run.mjs` (re-enable the skipped block, or invoke from legacy)

- [ ] **Step 1: Locate the benches** — `grep -rl "DITS_BENCH" legacy/ apps/cli/` and read the skipped block in `scripts/bench/run.mjs` (the `// Intentionally skipped` section).
- [ ] **Step 2: Make them runnable** — either `cargo test -p dits-chunker --manifest-path legacy/.../Cargo.toml -- --ignored` or port the two bench files onto `apps/cli`. Choose whichever builds; document the choice.
- [ ] **Step 3: Re-enable in `scripts/bench/run.mjs`** so `npm run bench` emits BLAKE3/SHA/FastCDC/serialize numbers into `latest.json` again.
- [ ] **Step 4: Run** `npm run bench`; Expected: `benchmarks/latest.json` includes `rust.dits-chunker` rows with live timestamps.
- [ ] **Step 5: Commit** engine-bench restoration + refreshed `latest.json`.

---

# PHASE 2 — PAGE

### Task 9: Comparative types + loader

**Files:**
- Create: `apps/web/src/lib/comparative-types.ts`
- Create: `apps/web/src/lib/bench-cost.ts`
- Modify: `apps/web/src/lib/benchmarks.server.ts`

- [ ] **Step 1: Write `comparative-types.ts`** (mirror `schema.mjs`)

```ts
export type Tier = "baseline" | "bleeding-edge" | "dits" | "dits-generic";
export interface CompMetrics {
  stored_bytes: number | null; wire_bytes: number | null; wall_ms: number | null;
  peak_rss_bytes: number | null; restore_ms: number | null; dedup_pct: number | null;
}
export interface CompRecord {
  workload: string; workload_label: string; tier: Tier; tool: string;
  dataset: { bytes: number; codec: string; label: string };
  metrics: CompMetrics;
  derived?: { cost_storage_usd_yr: number; cost_egress_usd_per_1k: number; upload_seconds_at_line: number };
  tool_version: string; run_timestamp: string; git_sha: string; machine: string; available: boolean;
}
export interface CumulativeSeries { tool: string; points: { edit: number; total_bytes: number }[]; }
export interface ScalingSeries { tool: string; points: { dataset_bytes: number; dedup_pct: number }[]; }
export interface ComparativeDoc {
  meta: { profile: string; generated_at: string; git_sha: string; machine: string;
    assumptions_url: string; tool_versions: Record<string, string> };
  records: CompRecord[]; cumulative: CumulativeSeries[]; scaling: ScalingSeries[];
}
```

- [ ] **Step 2: Write `bench-cost.ts`** — re-export the same `ASSUMPTIONS` numbers as `cost.mjs` for display labels (storage $/GB-mo, egress, line Mbps).
- [ ] **Step 3: Extend `benchmarks.server.ts`**

```ts
import type { ComparativeDoc } from "@/lib/comparative-types";
export async function loadComparative(): Promise<ComparativeDoc | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "benchmarks", "comparative", "latest.json");
    return JSON.parse(await readFile(filePath, "utf8")) as ComparativeDoc;
  } catch { return null; }
}
```

- [ ] **Step 4: Verify** `cd apps/web && npx tsc --noEmit` (or `npm run build`) — Expected: no type errors.
- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/comparative-types.ts apps/web/src/lib/bench-cost.ts apps/web/src/lib/benchmarks.server.ts
git commit -m "feat(web): comparative data types + loader"
```

---

### Task 10: Nav item + route + redirect

**Files:**
- Modify: `apps/web/src/components/header.tsx`
- Create: `apps/web/src/app/benchmarks/page.tsx`
- Modify: `apps/web/src/app/docs/benchmarks/page.tsx`

- [ ] **Step 1: Add nav item** — in `header.tsx`, change `navItems` to:

```tsx
const navItems = [
  { title: "Docs", href: "/docs" },
  { title: "Benchmarks", href: "/benchmarks" },
  { title: "About", href: "/about" },
  { title: "Community", href: "/community" },
];
```

- [ ] **Step 2: Stub the route**

```tsx
// apps/web/src/app/benchmarks/page.tsx
import type { Metadata } from "next";
import { loadComparative } from "@/lib/benchmarks.server";
export const metadata: Metadata = { title: "Benchmarks",
  description: "Real, reproducible, one-machine comparison of dits vs git-lfs, restic, borg, xdelta3." };
export default async function BenchmarksPage() {
  const doc = await loadComparative();
  return <main id="main-content" className="mx-auto max-w-5xl px-7">
    <h1 className="pt-24 text-4xl font-semibold">Benchmarks</h1>
    <p className="text-muted-foreground">{doc ? `${doc.records.length} measured results` : "Data unavailable"}</p>
  </main>;
}
```

- [ ] **Step 3: Redirect old path** — replace `app/docs/benchmarks/page.tsx` body with `import { redirect } from "next/navigation"; export default function() { redirect("/benchmarks"); }`.
- [ ] **Step 4: Verify** `cd apps/web && npm run build` — Expected: builds; `/benchmarks` route generated.
- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/header.tsx apps/web/src/app/benchmarks/page.tsx apps/web/src/app/docs/benchmarks/page.tsx
git commit -m "feat(web): top-level /benchmarks route + nav + redirect"
```

---

### Task 11: Keynote primitives — `keynote-section`, `count-up-stat`, `two-tier-bar`

**Files:**
- Create: `apps/web/src/components/benchmarks/keynote/keynote-section.tsx`
- Create: `apps/web/src/components/benchmarks/keynote/count-up-stat.tsx`
- Create: `apps/web/src/components/benchmarks/keynote/two-tier-bar.tsx`

- [ ] **Step 1: `keynote-section.tsx`** — `"use client"`; IntersectionObserver scroll-reveal; respects `prefers-reduced-motion` (no transform when reduced). Props: `{ chapter?: string; tag?: string; children }`. Renders a `<section>` with the light keynote spacing from the approved mockup (`keynote-light.html`).
- [ ] **Step 2: `count-up-stat.tsx`** — `"use client"`; animates 0→value on reveal; if `prefers-reduced-motion`, render the final value immediately. Props `{ value: number; suffix?: string }`.
- [ ] **Step 3: `two-tier-bar.tsx`** — server-renderable; props `{ rows: { label: string; sub?: string; pct: number; tone: "gray"|"green"|"red" }[]; valueLabel?: (r)=>string }`. Mirrors the `.compare/.crow/.ctrack/.cfill` markup from the mockup using Tailwind classes + the `--brand` token.
- [ ] **Step 4: Barrel export** — add these to a new `components/benchmarks/keynote/index.ts`.
- [ ] **Step 5: Verify** `cd apps/web && npm run build` — Expected: builds clean.
- [ ] **Step 6: Commit** `feat(web): keynote primitive components`.

---

### Task 12: Data-viz components — cumulative, scaling, matrix, money/time

**Files:**
- Create: `apps/web/src/components/benchmarks/keynote/cumulative-chart.tsx`
- Create: `apps/web/src/components/benchmarks/keynote/scaling-chart.tsx`
- Create: `apps/web/src/components/benchmarks/keynote/metric-matrix.tsx`
- Create: `apps/web/src/components/benchmarks/keynote/money-time-cards.tsx`

- [ ] **Step 1: `cumulative-chart.tsx`** — props `{ series: CumulativeSeries[] }`; render the diverging-lines SVG from the mockup (axes, one polyline per tool, end labels). If `series` empty, render a labeled "run the showcase profile" placeholder.
- [ ] **Step 2: `scaling-chart.tsx`** — props `{ series: ScalingSeries[] }`; line per tool, x = dataset size, y = dedup %.
- [ ] **Step 3: `metric-matrix.tsx`** — `"use client"`; props `{ records: CompRecord[] }`; tabs for storage/wire/time/memory/restore; sortable table; green for dits wins, red for the honest losses; CSV export button (`Blob` download). Tool columns derived from records; `available:false` → "n/a".
- [ ] **Step 4: `money-time-cards.tsx`** — props `{ record: CompRecord; assumptions }`; four cards (storage $/yr, upload time, egress $/1k, savings %) from `record.derived`; assumptions printed inline.
- [ ] **Step 5: Verify** build clean.
- [ ] **Step 6: Commit** `feat(web): cumulative/scaling/matrix/money-time viz`.

---

### Task 13: Assemble the keynote page

**Files:**
- Modify: `apps/web/src/app/benchmarks/page.tsx`

- [ ] **Step 1: Build a selector helper** — small pure functions in the page file (or `lib/comparative-select.ts`) to pull the records each section needs by `workload` + `tool`, e.g. `bestGeneric(records, workload)`, `ditsRec(records, workload)`. Unit-testable; add `benchmarks/comparative`-style is N/A here, so verify via build.
- [ ] **Step 2: Render all 13 sections** in order (Hero → Premise → Honest-loss → FACR → Streaming → Structural → Engine → Money/Time → Cumulative → Scaling → Matrix → More-edit-types → Methodology), wiring each to real `doc` data and the components from Tasks 11–12. Use the copy + tone from `keynote-light.html` and `keynote-moredata.html` verbatim where possible. Engine section reads the existing `loadLatestBenchmarks()` rows (BLAKE3 vs SHA-256).
- [ ] **Step 3: Numbers come only from JSON** — no hand-typed values except section prose; assert by grepping the page for the spike numbers and replacing with `doc`-derived values.
- [ ] **Step 4: Verify** `cd apps/web && npm run build && npm run lint` — Expected: clean. Then visual check (Task 15).
- [ ] **Step 5: Commit** `feat(web): assemble the benchmarks keynote page`.

---

### Task 14: Methodology, reproduce, and honesty surfacing

**Files:**
- Modify: `apps/web/src/app/benchmarks/page.tsx` (methodology section)

- [ ] **Step 1: Methodology section** — machine + all `doc.meta.tool_versions`, the `npm run bench:comparative` command, links to raw `latest.json` and the spec, and the cost assumptions. Include the explicit "where dits loses" callout (re-export, full-grade) per the radical-honesty guardrail.
- [ ] **Step 2: Projected-data labels** — any chart fed by an empty showcase series shows "projected from measured per-edit deltas" until real sweep data is present.
- [ ] **Step 3: Verify + Commit** `feat(web): methodology + reproduce + honesty callouts`.

---

### Task 15: Verification pass (whole feature)

- [ ] **Step 1: Harness** `npm run bench:comparative:test && npm run bench:comparative` — all node:tests pass; matrix validates; CI dedup asserts hold.
- [ ] **Step 2: Build** `npm run build` (root turbo) — web builds, types pass, `/benchmarks` prerenders, `/docs/benchmarks` redirects.
- [ ] **Step 3: Browser** — `cd apps/web && npm run dev`, open `/benchmarks`; confirm: light theme, percentages animate (and don't, under reduced motion), honest-loss section present, matrix tabs + CSV work, nav shows "Benchmarks" active.
- [ ] **Step 4: Honesty audit** — every number on screen traces to `latest.json`; the losses are visible; assumptions shown.
- [ ] **Step 5: Final commit** `chore(bench): verification pass`.

---

# PHASE 3 — EXPANSION (outline; spec to detail later)

- More workloads: `append`, `trim` (dits 0 bytes), `photo` (0 bytes), `grade-all` (honest ~0%), `cold-restore` (restore_ms across tools). Add runner methods + workload entries + matrix rows + Module E table.
- All dataset sizes (100 MB / 1 GB / 4 GB) wired into `scaling.json`.
- Full 50-commit `cumulative.json` on the reference machine, committed.
- `rsync` delta runner (openrsync batch) if it adds signal beyond xdelta3.
- Regression CI: wire `bench:comparative:test` into the existing CI workflow.

---

## Self-Review Notes

- **Spec coverage:** data contract (T1), harness/runners (T5), media determinism (T4), CI/showcase split (T6/T7), engine benches (T8), nav+route+redirect (T10), all 13 sections + 5 modules (T11–14), honesty guardrails (T14), testing (T15). Phase 3 carries the remaining "everything" workloads — matches spec's Phase 3.
- **Test tooling honesty:** harness uses `node --test` (real, matches `scripts/bench`); web has no unit runner, so web verification = `tsc/next build` + browser, not invented test commands.
- **Type consistency:** `CompMetrics` keys == `METRIC_KEYS` in `schema.mjs`; `derive()` keys match `money-time-cards` reads; `Tier`/tool strings match `TIERS`/`TOOLS`.
- **Known executor caveats flagged inline:** `stream-demo` non-serving flag (T5 S9), engine-bench location (T8), showcase manual sweeps (T7).
```
