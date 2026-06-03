export type Tier = "baseline" | "bleeding-edge" | "dits" | "dits-generic";

export interface CompMetrics {
  stored_bytes: number | null;
  wire_bytes: number | null;
  wall_ms: number | null;
  peak_rss_bytes: number | null;
  restore_ms: number | null;
  dedup_pct: number | null;
}

export interface CompDerived {
  cost_storage_usd_yr: number;
  cost_egress_usd_per_1k: number;
  upload_seconds_at_line: number;
}

export interface CompRecord {
  workload: string;
  workload_label: string;
  tier: Tier;
  tool: string;
  dataset: { bytes: number; codec: string; label: string };
  metrics: CompMetrics;
  derived?: CompDerived;
  tool_version: string;
  run_timestamp: string;
  git_sha: string;
  machine: string;
  available: boolean;
}

export interface CumulativeSeries {
  tool: string;
  points: { edit: number; total_bytes: number }[];
}

export interface ScalingSeries {
  tool: string;
  points: { dataset_bytes: number; dedup_pct: number }[];
}

export interface ComparativeDoc {
  meta: {
    profile: string;
    generated_at: string;
    git_sha: string;
    machine: string;
    assumptions_url: string;
    tool_versions: Record<string, string>;
  };
  records: CompRecord[];
  cumulative: CumulativeSeries[];
  scaling: ScalingSeries[];
}
