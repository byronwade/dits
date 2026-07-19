import { test } from "node:test";
import assert from "node:assert/strict";
import { TIERS, TOOLS, validateRecord } from "../schema.mjs";

test("valid record passes", () => {
  const rec = {
    workload: "facr-regrade", workload_label: "Re-color a few frames",
    tier: "dits", tool: "dits-facr",
    dataset: { bytes: 100663296, codec: "prores", label: "100 MB ProRes" },
    metrics: { stored_bytes: 87000, wire_bytes: null, wall_ms: 412, peak_rss_bytes: 73400320, restore_ms: null, dedup_pct: 98.3 },
    tool_version: "dits 0.1.0", run_timestamp: "2026-06-02T00:00:00Z",
    git_sha: "abc", machine: "M-series", available: true,
  };
  assert.equal(validateRecord(rec).ok, true);
});

test("unknown tier fails", () => {
  const bad = { workload: "x", workload_label: "x", tier: "nope", tool: "restic",
    dataset: { bytes: 1, codec: "h264", label: "x" },
    metrics: { stored_bytes: 1, wire_bytes: null, wall_ms: 1, peak_rss_bytes: 1, restore_ms: null, dedup_pct: 0 },
    tool_version: "x", run_timestamp: "x", git_sha: "x", machine: "x", available: true };
  assert.equal(validateRecord(bad).ok, false);
});

test("missing metric key fails", () => {
  const bad = { workload: "x", workload_label: "x", tier: "dits", tool: "dits-facr",
    dataset: { bytes: 1, codec: "h264", label: "x" },
    metrics: { stored_bytes: 1 }, tool_version: "x", run_timestamp: "x",
    git_sha: "x", machine: "x", available: true };
  assert.equal(validateRecord(bad).ok, false);
});

test("available runner must report elapsed time and deduplication", () => {
  const bad = { workload: "x", workload_label: "x", tier: "dits", tool: "dits-facr",
    dataset: { bytes: 1, codec: "h264", label: "x" },
    metrics: { stored_bytes: null, wire_bytes: null, wall_ms: null, peak_rss_bytes: null,
      restore_ms: null, dedup_pct: null },
    tool_version: "x", run_timestamp: "x", git_sha: "x", machine: "x", available: true };
  const result = validateRecord(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("wall_ms required")));
  assert.ok(result.errors.some((e) => e.includes("dedup_pct required")));
});

test("invalid numeric metrics fail", () => {
  const bad = { workload: "x", workload_label: "x", tier: "dits", tool: "dits-facr",
    dataset: { bytes: 1, codec: "h264", label: "x" },
    metrics: { stored_bytes: -1, wire_bytes: null, wall_ms: Number.NaN,
      peak_rss_bytes: null, restore_ms: null, dedup_pct: 101 },
    tool_version: "x", run_timestamp: "x", git_sha: "x", machine: "x", available: true };
  assert.equal(validateRecord(bad).ok, false);
});

test("vocabularies exported", () => {
  assert.ok(TIERS.includes("bleeding-edge") && TOOLS.includes("restic"));
});
