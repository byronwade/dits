import { mkdtempSync, copyFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { has, sh, DITS } from "./contract.mjs";
import { dirSizeBytes, timed, pct } from "../metrics.mjs";

export const tool = "dits-generic", tier = "dits-generic";
export const available = () => has(DITS);

export async function run({ v1, v2 }) {
  const repo = mkdtempSync(path.join(tmpdir(), "ditsg-"));
  const d = (...a) => sh(DITS, a, { cwd: repo });
  d("init");
  copyFileSync(v1, path.join(repo, "asset.bin")); d("add", "asset.bin"); d("commit", "-m", "v1");
  const s1 = dirSizeBytes(path.join(repo, ".dits"));
  const { ms } = await timed(async () => {
    copyFileSync(v2, path.join(repo, "asset.bin")); d("add", "asset.bin"); d("commit", "-m", "v2");
  });
  const stored = dirSizeBytes(path.join(repo, ".dits")) - s1;
  return { stored_bytes: stored, wire_bytes: stored, wall_ms: ms,
    peak_rss_bytes: null, restore_ms: null, dedup_pct: pct(statSync(v2).size, stored) };
}
