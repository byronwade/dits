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

const runnerModules = await Promise.all(
  ["gitlfs", "restic", "borg", "xdelta3", "ditsGeneric", "ditsFacr"].map((n) =>
    import(`./runners/${n}.mjs`)));
const byTool = Object.fromEntries(runnerModules.map((r) => [r.tool, r]));

const git = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const meta = {
  profile, generated_at: new Date().toISOString(), git_sha: git,
  machine: `${os.platform()} ${os.arch()} ${os.cpus()?.[0]?.model ?? ""}`.trim(),
  assumptions_url: "/benchmarks#methodology",
  tool_versions: Object.fromEntries(Object.values(byTool).map((r) =>
    [r.tool, r.available() ? "present" : "n/a"])),
};
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
    const rec = {
      workload: w.id, workload_label: w.label, tier: r.tier, tool: r.tool,
      dataset: ds, metrics, derived: derive(metrics),
      tool_version: r.tool, run_timestamp: meta.generated_at, git_sha: git,
      machine: meta.machine, available,
    };
    const v = validateRecord(rec);
    if (!v.ok) { console.error("invalid record", w.id, toolName, v.errors); process.exitCode = 1; }
    doc.records.push(rec);
  }
}

// Showcase: cumulative-over-N-edits sweep (slow; manual).
if (profile === "showcase") {
  const N = 50;
  for (const toolName of ["git-lfs", "restic", "dits-generic"]) {
    const r = byTool[toolName];
    if (!r?.available()) continue;
    const points = [];
    let total = 0;
    for (let i = 1; i <= N; i++) {
      const m = await r.run({ v1: path.join(MEDIA, "v1.mov"), v2: path.join(MEDIA, "v2_reexport.mov") });
      total += (m.stored_bytes ?? 0);
      points.push({ edit: i, total_bytes: total });
    }
    doc.cumulative.push({ tool: r.tool, points });
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
