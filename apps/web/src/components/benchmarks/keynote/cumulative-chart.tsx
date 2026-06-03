import type { CumulativeSeries } from "@/lib/comparative-types";

const COLORS: Record<string, string> = {
  "git-lfs": "#9aa0a6",
  restic: "#3b82f6",
  "dits-generic": "var(--brand)",
  "dits-facr": "var(--brand)",
  dits: "var(--brand)",
};
const LABELS: Record<string, string> = {
  "git-lfs": "git-lfs (re-stores everything)",
  restic: "restic (best general tool)",
  "dits-generic": "dits",
  "dits-facr": "dits",
};

const W = 900, H = 320, PAD_L = 70, PAD_B = 50, PAD_T = 20, PAD_R = 30;

/** Module B — cumulative store size across N edits. */
export function CumulativeChart({
  series,
  projected,
}: {
  series: CumulativeSeries[];
  projected?: { tool: string; label: string; color: string; endGb: number }[];
}) {
  if ((!series || series.length === 0) && projected && projected.length) {
    return <ProjectedChart rows={projected} />;
  }
  if (!series || series.length === 0) {
    return (
      <div className="mt-7 rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Run <code className="font-mono text-brand">npm run bench:comparative:showcase</code> to
        populate the 50-edit sweep.
      </div>
    );
  }

  const maxEdit = Math.max(...series.flatMap((s) => s.points.map((p) => p.edit)));
  const maxTotal = Math.max(...series.flatMap((s) => s.points.map((p) => p.total_bytes)));
  const x = (e: number) => PAD_L + (e / maxEdit) * (W - PAD_L - PAD_R);
  const y = (b: number) => H - PAD_B - (b / maxTotal) * (H - PAD_T - PAD_B);
  const gb = (b: number) => (b / 1_073_741_824).toFixed(1) + " GB";

  return (
    <div className="mt-7 rounded-2xl border border-border bg-card p-6">
      <Legend tools={series.map((s) => s.tool)} />
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="300" className="font-mono">
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="var(--border)" />
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--border)" />
        <text x={W / 2} y={H - 8} fontSize="11" fill="var(--muted-foreground)" textAnchor="middle">
          number of edits →
        </text>
        {series.map((s) => {
          const pts = s.points.map((p) => `${x(p.edit)},${y(p.total_bytes)}`).join(" ");
          const last = s.points[s.points.length - 1];
          return (
            <g key={s.tool}>
              <polyline fill="none" stroke={COLORS[s.tool] ?? "#888"} strokeWidth={3} points={pts} />
              <text x={x(last.edit) - 4} y={y(last.total_bytes) - 8} fontSize="12" fontWeight={700}
                fill={COLORS[s.tool] ?? "#888"} textAnchor="end">
                {gb(last.total_bytes)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ProjectedChart({ rows }: { rows: { tool: string; label: string; color: string; endGb: number }[] }) {
  const maxGb = Math.max(...rows.map((r) => r.endGb));
  const y = (g: number) => H - PAD_B - (g / maxGb) * (H - PAD_T - PAD_B);
  return (
    <div className="mt-7 rounded-2xl border border-border bg-card p-6">
      <div className="mb-2 flex flex-wrap gap-5 font-mono text-xs font-semibold text-muted-foreground">
        {rows.map((r) => (
          <span key={r.tool}>
            <i className="mr-1.5 inline-block h-2.5 w-5 rounded-sm align-middle" style={{ background: r.color }} />
            {r.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="300" className="font-mono">
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="var(--border)" />
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--border)" />
        <text x={W / 2} y={H - 8} fontSize="11" fill="var(--muted-foreground)" textAnchor="middle">
          number of edits →
        </text>
        {rows.map((r) => (
          <g key={r.tool}>
            <polyline fill="none" stroke={r.color} strokeWidth={3}
              points={`${PAD_L},${H - PAD_B} ${W - PAD_R},${y(r.endGb)}`} />
            <text x={W - PAD_R - 4} y={y(r.endGb) - 8} fontSize="12" fontWeight={700} fill={r.color} textAnchor="end">
              {r.endGb} GB
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        Projected from measured per-edit deltas. Run the showcase profile for the measured 50-edit sweep.
      </p>
    </div>
  );
}

function Legend({ tools }: { tools: string[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-5 font-mono text-xs font-semibold text-muted-foreground">
      {tools.map((t) => (
        <span key={t}>
          <i className="mr-1.5 inline-block h-2.5 w-5 rounded-sm align-middle" style={{ background: COLORS[t] ?? "#888" }} />
          {LABELS[t] ?? t}
        </span>
      ))}
    </div>
  );
}
