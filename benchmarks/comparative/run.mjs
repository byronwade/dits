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
      const args = w.facr
        ? { workload: w.id, ...(w.input ? { v1: path.join(MEDIA, w.input) } : {}) }
        : { v1: path.join(MEDIA, w.v1), v2: path.join(MEDIA, w.v2) };
      try { metrics = await r.run(args); } catch (e) { console.error(`${toolName}/${w.id}:`, e.message); }
    }
    const dsFile = w.input ?? w.v2;
    const ds = w.facr && !w.input
      ? { bytes: 0, codec: "synthetic", label: "FACR demo clip" }
      : { bytes: statSync(path.join(MEDIA, dsFile)).size, codec: dsFile.endsWith(".mov") ? "prores" : dsFile.endsWith(".png") ? "png" : "h264", label: w.label };
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

// Showcase: real measured cumulative sweep (slow; manual). N localized edits to one
// lossless clip; tracks each tool's store growth. dits-facr dedups at the frame level
// (grows by changed frames only); git-lfs/restic store the whole file each time / can't
// dedup across the FFV1 bitstream shifts. All three measured on one machine.
if (profile === "showcase") {
  const { runCumulative } = await import("./sweep-cumulative.mjs");
  doc.cumulative.push(...await runCumulative({ edits: 15, duration: 8, log: (m) => console.log("  " + m) }));
  const { runScaling } = await import("./sweep-scaling.mjs");
  doc.scaling.push(...await runScaling({ durations: [2, 4, 8, 16], log: (m) => console.log("  " + m) }));
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
