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
