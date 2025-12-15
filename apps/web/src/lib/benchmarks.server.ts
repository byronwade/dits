import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BenchmarkHistory, BenchmarkRun } from "@/lib/benchmarks-types";

export async function loadLatestBenchmarks(): Promise<BenchmarkRun | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "benchmarks", "latest.json");
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as BenchmarkRun;
  } catch {
    return null;
  }
}

export async function loadBenchmarkHistory(): Promise<BenchmarkHistory | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "benchmarks", "history.json");
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as BenchmarkHistory;
  } catch {
    return null;
  }
}
