import Link from "next/link";
import {
  loadBenchmarkHistory,
  loadLatestBenchmarks,
} from "@/lib/benchmarks.server";
import type { BenchmarkEntry, BenchmarkHistory, BenchmarkRun } from "@/lib/benchmarks-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value >= 100 ? value.toFixed(0) : value.toFixed(1);
}

function formatValue(unit: string, value: number) {
  if (unit === "mb_per_s") return `${formatNumber(value)} MB/s`;
  if (unit === "ops_per_s") return `${formatNumber(value)} ops/s`;
  if (unit === "ms") return `${formatNumber(value)} ms`;
  if (unit === "chunks") return `${formatNumber(value)} chunks`;
  return `${formatNumber(value)}`;
}

function pick(run: BenchmarkRun | null, name: string) {
  return run?.results?.find((r) => r.name === name) ?? null;
}

function keyFor(result: { suite: string; name: string; unit: string }) {
  return `${result.suite}|${result.name}|${result.unit}`;
}

function deltaPercent(
  history: BenchmarkHistory | null,
  current: BenchmarkEntry,
) {
  const key = keyFor(current);
  const list = history?.benchmarks?.[key];
  if (!list || list.length < 2) return null;
  const currentTs = current.timestamp ?? "";
  const previous = [...list].reverse().find((x) => String(x.timestamp) < String(currentTs));
  if (!previous) return null;
  if (!Number.isFinite(previous.value) || previous.value === 0) return null;
  return ((current.value - previous.value) / previous.value) * 100;
}

/**
 * Server Component: reads committed benchmark JSON through Cache Components
 * (`use cache` in loaders) so the homepage shell stays prerenderable.
 */
export async function BenchmarksHighlights() {
  const [run, history] = await Promise.all([
    loadLatestBenchmarks(),
    loadBenchmarkHistory(),
  ]);

  const highlights = [
    pick(run, "FastCDC stream (32 MiB)") ?? pick(run, "FastCDC chunk (32 MiB)"),
    pick(run, "BLAKE3 hash (1 MiB)"),
    pick(run, "add+commit+checkout 32 MiB") ?? pick(run, "getBinaryPath"),
  ].filter(Boolean) as BenchmarkEntry[];

  if (!run || highlights.length === 0) return null;

  const when = run.meta.timestamp
    ? new Date(run.meta.timestamp).toLocaleDateString()
    : null;

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">Benchmarks</Badge>
        <span className="text-xs">
          Latest: {when ?? "—"} ·{" "}
          <Link
            href="/benchmarks"
            className="underline underline-offset-4 hover:text-foreground"
          >
            View all
          </Link>
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {highlights.map((h) => {
          const d = deltaPercent(history, h);
          return (
            <Card key={`${h.suite}:${h.name}`} className="bg-background/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{h.name}</CardTitle>
                <CardDescription className="text-xs">{h.suite}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-lg font-semibold">
                    {formatValue(h.unit, h.value)}
                  </div>
                  {d !== null ? (
                    <span className="text-xs text-muted-foreground">
                      ({d > 0 ? "+" : ""}
                      {formatNumber(d)}%)
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
