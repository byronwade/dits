// Measured scaling sweep: the SAME localized edit (brighten a fixed ~0.5s window) on
// clips of increasing size. Shows dits' frame-dedup holds as files grow — the per-edit
// cost tracks the EDIT, not the file — while byte-level CDC (restic) can't dedup across
// the re-encode at any size. Lossless (FFV1) so unchanged frames decode identically.
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { has, sh, DITS } from "./runners/contract.mjs";
import { dirSizeBytes, pct } from "./metrics.mjs";

export async function runScaling({ durations = [2, 4, 8, 16], log = () => {} } = {}) {
  if (!has("ffmpeg") || !has(DITS)) {
    log("scaling sweep skipped (need ffmpeg + dits)");
    return [];
  }
  const work = mkdtempSync(path.join(tmpdir(), "scalesweep-"));
  const ditsPts = [];
  const resticPts = [];

  for (const dur of durations) {
    const base = path.join(work, `b${dur}.mkv`);
    const variant = path.join(work, `v${dur}.mkv`);
    sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i",
      `testsrc2=size=640x360:rate=30:duration=${dur}`, "-c:v", "ffv1", base]);
    // one fixed-size localized edit, same window regardless of clip length
    sh("ffmpeg", ["-y", "-v", "error", "-i", base, "-vf",
      "eq=brightness=0.5:enable='between(t,1.0,1.5)'", "-c:v", "ffv1", variant]);
    const fileBytes = statSync(variant).size;

    // dits-facr: store base, then variant — delta is the changed frames only.
    {
      const store = path.join(work, `s${dur}`);
      sh(DITS, ["facr-add", base, "--store", store, "--manifest", path.join(work, `bm${dur}.json`)]);
      const s0 = dirSizeBytes(store);
      sh(DITS, ["facr-add", variant, "--store", store, "--manifest", path.join(work, `vm${dur}.json`)]);
      const delta = Math.max(0, dirSizeBytes(store) - s0);
      ditsPts.push({ dataset_bytes: fileBytes, dedup_pct: pct(fileBytes, delta) });
    }

    // restic: store base, then variant.
    if (has("restic")) {
      const repo = path.join(work, `r${dur}`);
      const env = { ...process.env, RESTIC_PASSWORD: "x", RESTIC_REPOSITORY: repo };
      sh("restic", ["init", "-q"], { env });
      sh("restic", ["backup", "-q", base], { env });
      const r0 = dirSizeBytes(repo);
      sh("restic", ["backup", "-q", variant], { env });
      const delta = Math.max(0, dirSizeBytes(repo) - r0);
      resticPts.push({ dataset_bytes: fileBytes, dedup_pct: pct(fileBytes, delta) });
    }
    log(`size ${dur}s (${(fileBytes / 1048576).toFixed(1)}MB): dits ${ditsPts.at(-1).dedup_pct}%` +
      (resticPts.length ? `, restic ${resticPts.at(-1).dedup_pct}%` : ""));
  }

  const series = [{ tool: "dits-facr", points: ditsPts }];
  if (resticPts.length) series.push({ tool: "restic", points: resticPts });
  return series;
}
