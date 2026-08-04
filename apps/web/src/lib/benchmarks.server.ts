import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import type { BenchmarkHistory, BenchmarkRun } from "@/lib/benchmarks-types";
import type { ComparativeDoc } from "@/lib/comparative-types";

async function readPublicJson<T>(relativePath: string): Promise<T | null> {
  try {
    const filePath = path.join(process.cwd(), "public", relativePath);
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Comparative store-growth artifact (showcase / CI matrix). */
export async function loadComparative(): Promise<ComparativeDoc | null> {
  "use cache";
  cacheLife("days");
  cacheTag("benchmarks", "benchmarks-comparative");
  return readPublicJson<ComparativeDoc>("benchmarks/comparative/latest.json");
}

/** Latest component + repository microbenchmark run. */
export async function loadLatestBenchmarks(): Promise<BenchmarkRun | null> {
  "use cache";
  cacheLife("days");
  cacheTag("benchmarks", "benchmarks-latest");
  return readPublicJson<BenchmarkRun>("benchmarks/latest.json");
}

/** Rolling history used for highlight deltas. */
export async function loadBenchmarkHistory(): Promise<BenchmarkHistory | null> {
  "use cache";
  cacheLife("days");
  cacheTag("benchmarks", "benchmarks-history");
  return readPublicJson<BenchmarkHistory>("benchmarks/history.json");
}
