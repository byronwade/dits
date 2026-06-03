import { mkdtempSync, statSync } from "node:fs";
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
  const stored = s2 - s1;
  return { stored_bytes: stored, wire_bytes: stored, wall_ms: ms,
    peak_rss_bytes: null, restore_ms: null, dedup_pct: pct(statSync(v2).size, stored) };
}
