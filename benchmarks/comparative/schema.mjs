export const TIERS = ["baseline", "bleeding-edge", "dits", "dits-generic"];
export const TOOLS = ["git-lfs", "restic", "borg", "rsync", "xdelta3", "dits-generic", "dits-facr"];
export const METRIC_KEYS = ["stored_bytes", "wire_bytes", "wall_ms", "peak_rss_bytes", "restore_ms", "dedup_pct"];

export function validateRecord(rec) {
  const errors = [];
  const need = ["workload", "workload_label", "tier", "tool", "dataset", "metrics",
    "tool_version", "run_timestamp", "git_sha", "machine", "available"];
  for (const k of need) if (!(k in rec)) errors.push(`missing ${k}`);
  if (rec.tier && !TIERS.includes(rec.tier)) errors.push(`bad tier ${rec.tier}`);
  if (rec.tool && !TOOLS.includes(rec.tool)) errors.push(`bad tool ${rec.tool}`);
  if (rec.dataset && (!Number.isFinite(rec.dataset.bytes) || rec.dataset.bytes < 0)) errors.push("dataset.bytes");
  if (rec.metrics) {
    for (const k of METRIC_KEYS) {
      if (!(k in rec.metrics)) {
        errors.push(`metrics.${k} missing`);
        continue;
      }
      const value = rec.metrics[k];
      if (value !== null && (!Number.isFinite(value) || value < 0)) {
        errors.push(`metrics.${k} must be a non-negative finite number or null`);
      }
    }
    if (rec.metrics.dedup_pct != null && rec.metrics.dedup_pct > 100) {
      errors.push("metrics.dedup_pct must be <= 100");
    }
    // Every successful runner measures elapsed time and derives deduplication.
    // Requiring these prevents a command or parser failure from being published
    // as an apparently valid all-null benchmark record.
    if (rec.available) {
      for (const k of ["wall_ms", "dedup_pct"]) {
        if (rec.metrics[k] == null) errors.push(`metrics.${k} required when tool is available`);
      }
    }
  } else errors.push("metrics missing");
  return { ok: errors.length === 0, errors };
}

// Series record builders (cumulative + scaling) share the matrix's tool/tier vocabulary.
export function emptyDoc(meta) {
  return { meta, records: [], cumulative: [], scaling: [] };
}
