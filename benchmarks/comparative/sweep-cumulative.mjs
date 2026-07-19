// Measured cumulative sweep: N sequential localized edits to one clip, tracking how
// each tool's store grows. Uses a LOSSLESS (FFV1) intermediate so unchanged frames
// decode identically — the canonical-frame workflow dits is built for. Each edit
// brightens a fresh ~0.3s window; every version shares all other frames with the base.
//
// Honest result (measured, not projected): dits' frame store grows by only the changed
// frames; git-lfs re-stores the whole file every time; restic's byte-level CDC can't
// dedup across the FFV1 bitstream shifts, so it climbs nearly as fast as git-lfs.
import { mkdtempSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { has, sh, DITS } from "./runners/contract.mjs";
import { dirSizeBytes } from "./metrics.mjs";

export async function runCumulative({ edits = 15, duration = 8, log = () => {} } = {}) {
  if (!has("ffmpeg") || !has(DITS)) {
    log("cumulative sweep skipped (need ffmpeg + dits)");
    return [];
  }
  const work = mkdtempSync(path.join(tmpdir(), "cumsweep-"));
  const base = path.join(work, "base.mkv");
  sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i",
    `testsrc2=size=640x360:rate=30:duration=${duration}`, "-c:v", "ffv1", base]);

  // Build version_i = base with brightness on windows 1..i (distinct ~0.3s windows).
  const versions = [];
  for (let i = 1; i <= edits; i++) {
    const vf = Array.from({ length: i }, (_, k) => {
      const start = 0.2 + k * 0.45;
      return `eq=brightness=0.5:enable='between(t,${start.toFixed(2)},${(start + 0.3).toFixed(2)})'`;
    }).join(",");
    const out = path.join(work, `v${i}.mkv`);
    sh("ffmpeg", ["-y", "-v", "error", "-i", base, "-vf", vf, "-c:v", "ffv1", out]);
    versions.push(out);
  }
  log(`generated ${edits} lossless versions`);

  const series = [];

  // dits-facr: facr-add each version into ONE frame store; store grows by changed frames.
  {
    const store = path.join(work, "facrstore");
    const points = [];
    for (let i = 0; i < versions.length; i++) {
      sh(DITS, ["facr-add", versions[i], "--store", store,
        "--manifest", path.join(work, `m${i}.json`)]);
      points.push({ edit: i + 1, total_bytes: dirSizeBytes(store) });
    }
    series.push({ tool: "dits-facr", points });
    log(`dits-facr cumulative done (${points.at(-1).total_bytes} bytes after ${edits})`);
  }

  // git-lfs: full file every commit.
  if (has("git-lfs")) {
    const repo = mkdtempSync(path.join(tmpdir(), "cumglfs-"));
    const g = (...a) => sh("git", ["-C", repo, "-c", "user.email=a@b.c", "-c", "user.name=x", ...a]);
    sh("git", ["init", "-q", repo]);
    sh("git", ["-C", repo, "lfs", "install", "--local"], { allowFail: true });
    sh("git", ["-C", repo, "lfs", "track", "*.mkv"], { allowFail: true });
    g("add", "."); g("commit", "-qm", "init");
    const points = [];
    for (let i = 0; i < versions.length; i++) {
      copyFileSync(versions[i], path.join(repo, "a.mkv"));
      g("add", "a.mkv"); g("commit", "-qm", `v${i + 1}`);
      points.push({ edit: i + 1, total_bytes: dirSizeBytes(path.join(repo, ".git")) });
    }
    series.push({ tool: "git-lfs", points });
    log("git-lfs cumulative done");
  }

  // restic: byte-level CDC dedup.
  if (has("restic")) {
    const repo = path.join(work, "resticrepo");
    const env = { ...process.env, RESTIC_PASSWORD: "x", RESTIC_REPOSITORY: repo };
    sh("restic", ["init", "-q"], { env });
    const points = [];
    for (let i = 0; i < versions.length; i++) {
      sh("restic", ["backup", "-q", versions[i]], { env });
      points.push({ edit: i + 1, total_bytes: dirSizeBytes(repo) });
    }
    series.push({ tool: "restic", points });
    log("restic cumulative done");
  }

  return series;
}
