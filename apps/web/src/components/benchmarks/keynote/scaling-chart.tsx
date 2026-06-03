import type { ScalingSeries } from "@/lib/comparative-types";

const W = 900, H = 240, PAD_L = 60, PAD_B = 50, PAD_T = 20, PAD_R = 30;

/** Module C — does the saving hold as files get bigger? */
export function ScalingChart({
  series,
  projectedPct,
}: {
  series: ScalingSeries[];
  /** fallback flat line (e.g. ~98) when no measured sweep exists yet */
  projectedPct?: number;
}) {
  const hasData = series && series.length > 0;
  const sizes = hasData
    ? Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.dataset_bytes)))).sort((a, b) => a - b)
    : [104857600, 1073741824, 4294967296];
  const x = (i: number) => PAD_L + ((i + 0.5) / sizes.length) * (W - PAD_L - PAD_R);
  const y = (pct: number) => H - PAD_B - (pct / 100) * (H - PAD_T - PAD_B);
  const sizeLabel = (b: number) =>
    b >= 1_073_741_824 ? `${Math.round(b / 1_073_741_824)} GB` : `${Math.round(b / 1_048_576)} MB`;

  const ditsPoints = sizes.map((sz, i) => {
    const measured = hasData
      ? series.find((s) => s.tool.startsWith("dits"))?.points.find((p) => p.dataset_bytes === sz)?.dedup_pct
      : undefined;
    return { x: x(i), pct: measured ?? projectedPct ?? 98 };
  });

  return (
    <div className="mt-7 rounded-2xl border border-border bg-card p-6">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="220" className="font-mono">
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="var(--border)" />
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--border)" />
        <text x={28} y={y(100) + 4} fontSize="11" fill="var(--muted-foreground)">100%</text>
        <text x={34} y={H - PAD_B} fontSize="11" fill="var(--muted-foreground)">0%</text>
        <polyline fill="none" stroke="var(--brand)" strokeWidth={3.5}
          points={ditsPoints.map((p) => `${p.x},${y(p.pct)}`).join(" ")} />
        {ditsPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={y(p.pct)} r={5} fill="var(--brand)" />
        ))}
        <text x={ditsPoints[0].x} y={y(ditsPoints[0].pct) - 12} fontSize="12" fontWeight={700} fill="var(--brand)">
          ~{Math.round(ditsPoints[0].pct)}% saved
        </text>
        {sizes.map((sz, i) => (
          <text key={sz} x={x(i)} y={H - 16} fontSize="12" fill="var(--muted-foreground)" textAnchor="middle">
            {sizeLabel(sz)}
          </text>
        ))}
      </svg>
      {!hasData && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Projected. Run the showcase profile across sizes for the measured sweep.
        </p>
      )}
    </div>
  );
}
