import { COST_ASSUMPTIONS, COST_ASSUMPTIONS_LABEL } from "@/lib/bench-cost";

const GB = 1_073_741_824;

function usd(n: number) {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(2)}`;
  return "<$0.01";
}
function secs(s: number) {
  if (s < 60) return `${s < 10 ? s.toFixed(1) : s.toFixed(0)} s`;
  return `${(s / 60).toFixed(1)} min`;
}

/**
 * Module A — translate a *measured* dedup % into money & time for a labeled
 * reference clip size. The % is real; the reference size and rates are stated.
 */
export function MoneyTimeCards({
  dedupPct,
  refBytes = GB,
  refLabel = "a 1 GB clip",
}: {
  dedupPct: number;
  refBytes?: number;
  refLabel?: string;
}) {
  const a = COST_ASSUMPTIONS;
  const fullGb = refBytes / GB;
  const ditsGb = fullGb * (1 - dedupPct / 100);
  const fullStoreYr = fullGb * a.storage_usd_per_gb_mo * 12;
  const ditsStoreYr = ditsGb * a.storage_usd_per_gb_mo * 12;
  const fullUpload = (fullGb * 8 * 1024) / a.line_mbps;
  const ditsUpload = (ditsGb * 8 * 1024) / a.line_mbps;

  const cards = [
    { k: "Storage / version / yr", full: usd(fullStoreYr), v: usd(ditsStoreYr) },
    { k: "Upload time", full: secs(fullUpload), v: secs(ditsUpload) },
    {
      k: "Egress / 1k viewers",
      full: usd(fullGb * a.egress_usd_per_gb * 1000),
      v: usd(ditsGb * a.egress_usd_per_gb * 1000),
    },
    { k: "Data saved", full: null, v: `${dedupPct}%` },
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
            {c.full && (
              <div className="text-xs text-muted-foreground">
                vs <span className="line-through">{c.full}</span> re-storing the file
              </div>
            )}
            {!c.full && <div className="text-xs text-muted-foreground">of the file reused</div>}
          </div>
        ))}
      </div>
      <p className="mt-4 font-mono text-xs text-muted-foreground">
        Measured dedup applied to {refLabel}. Assumptions: {COST_ASSUMPTIONS_LABEL}. No hidden math.
      </p>
    </div>
  );
}
