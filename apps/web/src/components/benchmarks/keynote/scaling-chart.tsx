import type { ScalingSeries } from "@/lib/comparative-types";

const W = 900, H = 260, PAD_L = 60, PAD_B = 56, PAD_T = 24, PAD_R = 40;

const COLORS: Record<string, string> = {
  "dits-facr": "var(--brand)",
  dits: "var(--brand)",
  restic: "#3b82f6",
  "git-lfs": "#9aa0a6",
};
const LABELS: Record<string, string> = {
  "dits-facr": "dits",
  restic: "restic (byte-level dedup)",
  "git-lfs": "git-lfs",
};

/** Module C — does the saving hold as files get bigger? */
export function ScalingChart({
  series,
  projectedPct,
}: {
  series: ScalingSeries[];
  /** fallback flat line (e.g. ~98) when no measured sweep exists yet */
  projectedPct?: number;
}) {
  const hasData = series && series.some((s) => s.points.length > 0);

  if (!hasData) {
    // projected single dits line across illustrative sizes
    const sizes = [104857600, 1073741824, 4294967296];
    const x = (i: number) => PAD_L + ((i + 0.5) / sizes.length) * (W - PAD_L - PAD_R);
    const y = (pct: number) => H - PAD_B - (pct / 100) * (H - PAD_T - PAD_B);
    const pts = sizes.map((_, i) => `${x(i)},${y(projectedPct ?? 98)}`).join(" ");
    return (
      <div className="mt-7 rounded-2xl border border-border bg-card p-6">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="240" className="font-mono">
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="var(--border)" />
          <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--border)" />
          <polyline fill="none" stroke="var(--brand)" strokeWidth={3.5} points={pts} />
          {sizes.map((b, i) => (
            <text key={b} x={x(i)} y={H - 18} fontSize="12" fill="var(--muted-foreground)" textAnchor="middle">
              {b >= 1_073_741_824 ? `${Math.round(b / 1_073_741_824)} GB` : `${Math.round(b / 1_048_576)} MB`}
            </text>
          ))}
        </svg>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Projected. Run the showcase profile across sizes for the measured sweep.
        </p>
      </div>
    );
  }

  const sizes = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.dataset_bytes)))).sort((a, b) => a - b);
  const x = (sz: number) => PAD_L + (sizes.indexOf(sz) + 0.5) / sizes.length * (W - PAD_L - PAD_R);
  const y = (pct: number) => H - PAD_B - (pct / 100) * (H - PAD_T - PAD_B);
  const sizeLabel = (b: number) =>
    b >= 1_073_741_824 ? `${(b / 1_073_741_824).toFixed(1)} GB` : `${Math.round(b / 1_048_576)} MB`;

  return (
    <div className="mt-7 rounded-2xl border border-border bg-card p-6">
      <div className="mb-2 flex flex-wrap gap-5 font-mono text-xs font-semibold text-muted-foreground">
        {series.map((s) => (
          <span key={s.tool}>
            <i className="mr-1.5 inline-block h-2.5 w-5 rounded-sm align-middle" style={{ background: COLORS[s.tool] ?? "#888" }} />
            {LABELS[s.tool] ?? s.tool}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="240" className="font-mono">
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="var(--border)" />
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--border)" />
        <text x={PAD_L - 8} y={y(100) + 4} fontSize="11" fill="var(--muted-foreground)" textAnchor="end">100%</text>
        <text x={PAD_L - 8} y={H - PAD_B} fontSize="11" fill="var(--muted-foreground)" textAnchor="end">0%</text>
        <text x={W / 2} y={H - 6} fontSize="11" fill="var(--muted-foreground)" textAnchor="middle">
          clip size · % of the file dits / restic skip on a localized edit →
        </text>
        {series.map((s) => {
          const pts = s.points.map((p) => `${x(p.dataset_bytes)},${y(p.dedup_pct)}`).join(" ");
          const last = s.points[s.points.length - 1];
          return (
            <g key={s.tool}>
              <polyline fill="none" stroke={COLORS[s.tool] ?? "#888"} strokeWidth={3.5} points={pts} />
              {s.points.map((p) => (
                <circle key={p.dataset_bytes} cx={x(p.dataset_bytes)} cy={y(p.dedup_pct)} r={4} fill={COLORS[s.tool] ?? "#888"} />
              ))}
              <text x={x(last.dataset_bytes) + 6} y={y(last.dedup_pct) + 4} fontSize="12" fontWeight={700}
                fill={COLORS[s.tool] ?? "#888"}>{Math.round(last.dedup_pct)}%</text>
            </g>
          );
        })}
        {sizes.map((sz) => (
          <text key={sz} x={x(sz)} y={H - 22} fontSize="11" fill="var(--muted-foreground)" textAnchor="middle">
            {sizeLabel(sz)}
          </text>
        ))}
      </svg>
    </div>
  );
}
