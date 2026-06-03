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
