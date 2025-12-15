"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BenchmarkHistory, BenchmarkRun } from "@/lib/benchmarks-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value >= 100 ? value.toFixed(0) : value.toFixed(1);
}

function formatValue(unit: string, value: number) {
  if (unit === "mb_per_s") return `${formatNumber(value)} MB/s`;
  if (unit === "ops_per_s") return `${formatNumber(value)} ops/s`;
  return `${formatNumber(value)}`;
}

function pick(run: BenchmarkRun | null, name: string) {
  return run?.results?.find((r) => r.name === name) ?? null;
}

function keyFor(result: { suite: string; name: string; unit: string }) {
  return `${result.suite}|${result.name}|${result.unit}`;
}

function deltaPercent(history: BenchmarkHistory | null, current: { suite: string; name: string; unit: string; timestamp?: string; value: number }) {
  const key = keyFor(current);
  const list = history?.benchmarks?.[key];
  if (!list || list.length < 2) return null;
  const currentTs = current.timestamp ?? "";
  const previous = [...list].reverse().find((x) => String(x.timestamp) < String(currentTs));
  if (!previous) return null;
  if (!Number.isFinite(previous.value) || previous.value === 0) return null;
  return ((current.value - previous.value) / previous.value) * 100;
}

export function BenchmarksHighlights() {
  const [run, setRun] = useState<BenchmarkRun | null>(null);
  const [history, setHistory] = useState<BenchmarkHistory | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/benchmarks/latest.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setRun(data);
      })
      .catch(() => {
        if (!cancelled) setRun(null);
      });
    fetch("/benchmarks/history.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch(() => {
        if (!cancelled) setHistory(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const highlights = useMemo(() => {
    const fastcdc = pick(run, "FastCDCChunker::chunk(32MiB)");
    const hasher = pick(run, "Hasher::hash(1MiB)");
    const resolver = pick(run, "getBinaryPath");
    return [fastcdc, hasher, resolver].filter(Boolean) as NonNullable<typeof fastcdc>[];
  }, [run]);

  if (!run || highlights.length === 0) return null;

  const when = run.meta.timestamp ? new Date(run.meta.timestamp).toLocaleDateString() : null;

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">Benchmarks</Badge>
        <span className="text-xs">
          Latest: {when ?? "—"} ·{" "}
          <Link href="/docs/benchmarks" className="underline underline-offset-4 hover:text-foreground">
            View all
          </Link>
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {highlights.map((h) => (
          <Card key={`${h.suite}:${h.name}`} className="bg-background/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{h.name}</CardTitle>
              <CardDescription className="text-xs">{h.suite}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-lg font-semibold">{formatValue(h.unit, h.value)}</div>
                {(() => {
                  const d = deltaPercent(history, h);
                  if (d === null) return null;
                  const sign = d > 0 ? "+" : "";
                  return (
                    <span className="text-xs text-muted-foreground">
                      ({sign}
                      {formatNumber(d)}%)
                    </span>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
