import { cn } from "@/lib/utils";

export type BarTone = "gray" | "green" | "red";

export interface BarRow {
  label: string;
  sub?: string;
  /** 0–100 width of the fill */
  pct: number;
  tone: BarTone;
  /** text shown at the end of the fill, e.g. "70 MB" or "saved 27%" */
  value: string;
}

const TONE: Record<BarTone, string> = {
  gray: "bg-muted-foreground/55",
  green: "", // brand via inline style (token-reliable)
  red: "bg-red-500/85",
};

/** Plain "everyone else vs dits" comparison bars — the page's core visual. */
export function TwoTierBar({ rows }: { rows: BarRow[] }) {
  return (
    <div className="mt-8 flex max-w-2xl flex-col gap-4">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[150px_1fr] items-center gap-4 sm:grid-cols-[190px_1fr]">
          <div className="text-sm font-semibold">
            {r.label}
            {r.sub && (
              <span className="mt-0.5 block font-mono text-xs font-medium text-muted-foreground">
                {r.sub}
              </span>
            )}
          </div>
          <div className="relative h-11 overflow-hidden rounded-[10px] border border-border bg-muted/40">
            <div
              className={cn(
                "flex h-full min-w-[84px] items-center justify-end rounded-[9px] px-3.5 font-mono text-sm font-bold text-white",
                TONE[r.tone]
              )}
              style={{
                width: `${Math.max(4, Math.min(100, r.pct))}%`,
                ...(r.tone === "green" ? { backgroundColor: "var(--brand)" } : {}),
              }}
            >
              {r.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
