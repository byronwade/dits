import type { CompRecord } from "@/lib/comparative-types";
import { cn } from "@/lib/utils";

function find(records: CompRecord[], workload: string, tool: string) {
  return records.find((r) => r.workload === workload && r.tool === tool);
}
function bestOther(records: CompRecord[], workload: string) {
  const others = records.filter((r) => r.workload === workload && !r.tool.startsWith("dits"));
  if (!others.length) return null;
  return others.reduce((a, b) => ((a.metrics.dedup_pct ?? 0) >= (b.metrics.dedup_pct ?? 0) ? a : b));
}
function savedLabel(pct: number | null | undefined) {
  if (pct == null) return "—";
  return `${pct}%`;
}

/** Module E — more edit types, including the literal zero-byte wins. */
export function MoreEditTypes({ records }: { records: CompRecord[] }) {
  const trim = find(records, "trim", "dits-facr");
  const photo = find(records, "photo", "dits-facr");
  const grade = find(records, "grade-all", "dits-generic");
  const gradeOther = bestOther(records, "grade-all");

  const zeroByte = [
    { title: "Trim a clip", body: trim, blurb: "Cut the first second; dits just remembers the new in/out points." },
    { title: "Edit a photo", body: photo, blurb: "Crop, brighten, filter — dits stores the recipe, reuses the original pixels." },
  ];

  const rows = [
    { what: "Trim / cut", other: "re-stores the trimmed file", dits: trim, win: true },
    { what: "Non-destructive photo edit", other: "re-stores the full image", dits: photo, win: true },
    {
      what: "Color-grade the WHOLE clip",
      other: gradeOther ? `${savedLabel(gradeOther.metrics.dedup_pct)} (${gradeOther.tool})` : "—",
      dits: grade,
      win: false,
      honest: true,
    },
  ];

  return (
    <div>
      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {zeroByte.map((z) => (
          <div key={z.title} className="rounded-2xl border border-brand/30 bg-brand/5 p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-semibold">{z.title}</h3>
              <span className="font-mono text-sm font-bold text-brand">
                {z.body && z.body.metrics.stored_bytes === 0 ? "0 bytes" : savedLabel(z.body?.metrics.dedup_pct)}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{z.blurb}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse font-mono text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2.5 font-semibold">Edit type</th>
              <th className="px-3 py-2.5 font-semibold">Best other tool</th>
              <th className="px-3 py-2.5 font-semibold">dits</th>
              <th className="px-3 py-2.5 font-semibold">You save</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.what} className="border-b border-border">
                <td className="px-3 py-2.5 text-foreground">{r.what}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{r.other}</td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {r.dits?.metrics.stored_bytes === 0 ? "0 bytes" : savedLabel(r.dits?.metrics.dedup_pct)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 font-bold",
                    r.honest ? "text-red-500" : r.win ? "text-brand" : "text-muted-foreground"
                  )}
                >
                  {r.honest ? "~0% (honest)" : savedLabel(r.dits?.metrics.dedup_pct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
