export interface BenchmarkMeta {
  timestamp: string | null;
  git_sha: string | null;
  node: string | null;
  rustc: string | null;
  platform: string | null;
  arch: string | null;
  cpu: string | null;
}

export interface BenchmarkEntry {
  timestamp?: string;
  git_sha?: string | null;
  suite: string;
  name: string;
  metric: "throughput";
  unit: "mb_per_s" | "ops_per_s";
  value: number;
  iterations?: number;
  bytes_per_iter?: number;
  elapsed_ms_total?: number;
}

export interface BenchmarkRun {
  meta: BenchmarkMeta;
  results: BenchmarkEntry[];
}

export interface BenchmarkHistoryEntry {
  timestamp: string;
  git_sha: string | null;
  suite: string;
  name: string;
  unit: "mb_per_s" | "ops_per_s";
  value: number;
  iterations: number | null;
  bytes_per_iter: number | null;
  elapsed_ms_total: number | null;
}

export interface BenchmarkHistory {
  meta: {
    generated_at: string | null;
    max_per_benchmark: number;
  };
  benchmarks: Record<string, BenchmarkHistoryEntry[]>;
}
