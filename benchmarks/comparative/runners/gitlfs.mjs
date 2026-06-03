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
    copyFileSync(v2, path.join(repo, "asset.bin")); g("add", "asset.bin"); g("commit", "-qm", "v2");
  });
  const stored = dirSizeBytes(path.join(repo, ".git")) - s1;
  return { stored_bytes: stored, wire_bytes: stored, wall_ms: ms,
    peak_rss_bytes: null, restore_ms: null, dedup_pct: pct(statSync(v2).size, stored) };
}
