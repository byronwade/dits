"use client";

import { useMemo, useState } from "react";
import type { CompRecord } from "@/lib/comparative-types";
import { cn } from "@/lib/utils";

type MetricKey = "dedup_pct" | "stored_bytes" | "wire_bytes" | "wall_ms" | "peak_rss_bytes";
const TABS: { key: MetricKey; label: string; fmt: (n: number) => string; higherBetter: boolean }[] = [
  { key: "dedup_pct", label: "Storage saved", fmt: (n) => `${n}%`, higherBetter: true },
  { key: "stored_bytes", label: "Stored", fmt: fmtBytes, higherBetter: false },
  { key: "wire_bytes", label: "Uploaded", fmt: fmtBytes, higherBetter: false },
  { key: "wall_ms", label: "Time", fmt: (n) => `${(n / 1000).toFixed(2)} s`, higherBetter: false },
  { key: "peak_rss_bytes", label: "Memory", fmt: fmtBytes, higherBetter: false },
];

function fmtBytes(n: number) {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

export function MetricMatrix({ records }: { records: CompRecord[] }) {
  const [tab, setTab] = useState<MetricKey>("dedup_pct");
  const active = TABS.find((t) => t.key === tab)!;

  const rows = useMemo(() => {
    const byWorkload = new Map<string, CompRecord[]>();
    for (const r of records) {
      if (!byWorkload.has(r.workload)) byWorkload.set(r.workload, []);
      byWorkload.get(r.workload)!.push(r);
    }
    return [...byWorkload.entries()].map(([, recs]) => ({
      label: recs[0].workload_label,
      cells: recs.map((r) => ({
        tool: r.tool,
        tier: r.tier,
        available: r.available,
        value: r.metrics[tab],
      })),
    }));
  }, [records, tab]);

  function exportCsv() {
    const header = ["workload", "tool", "tier", "metric", "value", "available"];
    const lines = [header.join(",")];
    for (const r of records) {
      lines.push([r.workload, r.tool, r.tier, active.key, String(r.metrics[active.key] ?? ""), String(r.available)].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dits-benchmarks-${active.key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-3.5 py-2 font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === t.key
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={exportCsv}
          className="ml-auto rounded-full border border-border bg-card px-3.5 py-2 font-mono text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ↓ CSV
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No benchmark matrix rows</p>
            <p className="mt-2">
              Run <code className="font-mono text-brand">npm run bench:comparative</code> to
              populate comparative metrics.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse font-mono text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5 font-semibold">What you did</th>
                {rows[0]?.cells.map((c) => (
                  <th key={c.tool} className="px-3 py-2.5 font-semibold">{c.tool}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border">
                  <td className="px-3 py-2.5 text-foreground">{row.label}</td>
                  {row.cells.map((c) => {
                    const isDits = c.tier === "dits";
                    const isLoss = c.tier === "dits-generic" && active.key === "dedup_pct" && (c.value ?? 0) < 10;
                    return (
                      <td
                        key={c.tool}
                        className={cn(
                          "px-3 py-2.5",
                          !c.available || c.value == null
                            ? "text-muted-foreground/60"
                            : isLoss
                            ? "font-bold text-red-500"
                            : isDits
                            ? "font-bold text-brand"
                            : "text-muted-foreground"
                        )}
                      >
                        {!c.available ? "n/a" : c.value == null ? "—" : active.fmt(c.value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
