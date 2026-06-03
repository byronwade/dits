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
