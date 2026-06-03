import { spawnSync } from "node:child_process";
import { has, sh, DITS } from "./contract.mjs";
import { timed } from "../metrics.mjs";

export const tool = "dits-facr", tier = "dits";
export const available = () => has(DITS);

// stream-demo serves an HTTP player after printing its byte report, so we capture
// stdout under a timeout and kill it — the numbers are printed before it serves.
function captureWithTimeout(cmd, args, ms) {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: ms, killSignal: "SIGKILL" });
  return (r.stdout || "") + (r.stderr || "");
}

export async function run({ workload }) {
  if (workload === "stream") {
    let out = "";
    const { ms } = await timed(async () => {
      out = captureWithTimeout(DITS, ["stream-demo", "--grade-start", "4", "--grade-end", "6",
        "--segment-seconds", "2", "--port", "8099"], 90_000);
    });
    const re = out.match(/re-delivered\s*:\s*([\d.]+)\s*KB[^]*?:\s*([\d.]+)\s*KB/);
    const shipped = re ? Math.round(Number(re[1]) * 1024) : null;
    const naive = re ? Number(re[2]) * 1024 : null;
    const dedup = re ? Math.round((1 - shipped / naive) * 1000) / 10 : null;
    return { stored_bytes: shipped, wire_bytes: shipped, wall_ms: ms,
      peak_rss_bytes: null, restore_ms: null, dedup_pct: dedup };
  }
  // default: facr-regrade
  let out = "";
  const { ms } = await timed(async () => {
    out = sh(DITS, ["facr-demo", "--frames", "300", "--regrade", "5"]).stdout;
  });
  const df = out.match(/dedup fraction\s*:\s*([\d.]+)%/);
  return { stored_bytes: null, wire_bytes: null, wall_ms: ms,
    peak_rss_bytes: null, restore_ms: null, dedup_pct: df ? Number(df[1]) : null };
}
