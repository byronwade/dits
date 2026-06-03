import type { CompRecord } from "@/lib/comparative-types";
import { COST_ASSUMPTIONS_LABEL } from "@/lib/bench-cost";

function fmtUsd(n: number) {
  return n < 0.01 ? "<$0.01" : `$${n.toFixed(2)}`;
}
function fmtSecs(s: number) {
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  return `${(s / 60).toFixed(1)} min`;
}

/** Module A — translate a record's bytes into money & time. */
export function MoneyTimeCards({ record }: { record: CompRecord }) {
  const d = record.derived;
  const cards = [
    { k: "Cloud storage / yr", v: d ? fmtUsd(d.cost_storage_usd_yr) : "—", d: "to keep this version" },
    { k: "Upload time", v: d ? fmtSecs(d.upload_seconds_at_line) : "—", d: "on a 50 Mbps line" },
    { k: "Egress / 1k viewers", v: d ? fmtUsd(d.cost_egress_usd_per_1k) : "—", d: "to deliver it" },
    {
      k: "Data saved",
      v: record.metrics.dedup_pct != null ? `${record.metrics.dedup_pct}%` : "—",
      d: "vs re-storing the file",
    },
  ];
  return (
    <div>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.k} className="rounded-2xl border border-border bg-card p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {c.k}
            </div>
            <div className="mt-1.5 text-3xl font-bold tracking-tight text-brand">{c.v}</div>
            <div className="text-xs text-muted-foreground">{c.d}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 font-mono text-xs text-muted-foreground">
        Assumptions: {COST_ASSUMPTIONS_LABEL}. No hidden math.
      </p>
    </div>
  );
}
