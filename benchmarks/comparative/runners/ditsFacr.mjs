import { mkdtempSync, copyFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { has, sh, DITS } from "./contract.mjs";
import { dirSizeBytes, timed, pct } from "../metrics.mjs";

export const tool = "dits-facr", tier = "dits";
export const available = () => has(DITS);

export function parseStreamMetrics(out) {
  const match = out.match(
    /re-delivered\s*:\s*([\d.]+)\s*KB\s*\(naive full re-encode:\s*([\d.]+)\s*KB\)/,
  );
  if (!match) throw new Error("stream-demo did not emit its byte-accounting report");

  const shipped = Math.round(Number(match[1]) * 1024);
  const naive = Number(match[2]) * 1024;
  if (!Number.isFinite(shipped) || shipped < 0 || !Number.isFinite(naive) || naive <= 0) {
    throw new Error(`stream-demo emitted invalid byte metrics: shipped=${shipped}, naive=${naive}`);
  }

  return {
    stored_bytes: shipped,
    wire_bytes: shipped,
    dedup_pct: Math.round((1 - shipped / naive) * 1000) / 10,
  };
}

export async function run({ workload, v1 }) {
  // Non-destructive trim: ingest a real clip, trim a frame range — stores ZERO new frames.
  if (workload === "trim") {
    const work = mkdtempSync(path.join(tmpdir(), "facrtrim-"));
    const clip = path.join(work, "clip.mp4");
    const store = path.join(work, "store");
    copyFileSync(v1, clip);
    sh(DITS, ["facr-add", clip, "--store", store, "--manifest", path.join(work, "c.facr.json")]);
    const s1 = dirSizeBytes(store);
    const { ms } = await timed(async () =>
      sh(DITS, ["facr-trim", path.join(work, "c.facr.json"), "--start", "30", "--end", "120",
        "--out", path.join(work, "c.trim.json")]));
    const stored = Math.max(0, dirSizeBytes(store) - s1);
    return { stored_bytes: stored, wire_bytes: stored, wall_ms: ms,
      peak_rss_bytes: null, restore_ms: null, dedup_pct: pct(statSync(v1).size, stored) };
  }
  // Non-destructive photo edit: store the original once, append edits — ZERO new image bytes.
  if (workload === "photo") {
    const work = mkdtempSync(path.join(tmpdir(), "facrphoto-"));
    const img = path.join(work, "photo.png");
    const store = path.join(work, "store");
    copyFileSync(v1, img);
    sh(DITS, ["photo-add", img, "--store", store, "--manifest", path.join(work, "p.photo.json")]);
    const s1 = dirSizeBytes(store);
    const { ms } = await timed(async () =>
      sh(DITS, ["photo-edit", path.join(work, "p.photo.json"), "--exposure", "0.5",
        "--contrast", "1.2", "--saturation", "1.1"]));
    const stored = Math.max(0, dirSizeBytes(store) - s1);
    return { stored_bytes: stored, wire_bytes: stored, wall_ms: ms,
      peak_rss_bytes: null, restore_ms: null, dedup_pct: pct(statSync(v1).size, stored) };
  }
  if (workload === "stream") {
    const { ms, value } = await timed(async () =>
      sh(DITS, ["stream-demo", "--grade-start", "4", "--grade-end", "6",
        "--segment-seconds", "2", "--report-only"]));
    const measured = parseStreamMetrics((value.stdout || "") + (value.stderr || ""));
    return { ...measured, wall_ms: ms, peak_rss_bytes: null, restore_ms: null };
  }
  // default: facr-regrade
  let out = "";
  const { ms } = await timed(async () => {
    out = sh(DITS, ["facr-demo", "--frames", "300", "--regrade", "5"]).stdout;
  });
  const df = out.match(/dedup fraction\s*:\s*([\d.]+)%/);
  if (!df) throw new Error("facr-demo did not emit its deduplication report");
  return { stored_bytes: null, wire_bytes: null, wall_ms: ms,
    peak_rss_bytes: null, restore_ms: null, dedup_pct: Number(df[1]) };
}
