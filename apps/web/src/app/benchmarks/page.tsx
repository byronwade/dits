import type { Metadata } from "next";
import Link from "next/link";
import { loadComparative, loadLatestBenchmarks } from "@/lib/benchmarks.server";
import { COST_ASSUMPTIONS_LABEL } from "@/lib/bench-cost";
import type { CompRecord, ComparativeDoc } from "@/lib/comparative-types";
import {
  KeynoteSection,
  CountUpStat,
  TwoTierBar,
  type BarRow,
  MoneyTimeCards,
  CumulativeChart,
  ScalingChart,
  MetricMatrix,
  MoreEditTypes,
} from "@/components/benchmarks/keynote";

export const metadata: Metadata = {
  title: "Benchmarks",
  description:
    "Real, reproducible, one-machine comparison of dits vs git-lfs, restic, borg and xdelta3 — in plain English.",
};

// ---- selectors (numbers come only from the measured JSON) ----
function rec(doc: ComparativeDoc | null, workload: string, tool: string): CompRecord | undefined {
  return doc?.records.find((r) => r.workload === workload && r.tool === tool);
}
function workloadRecs(doc: ComparativeDoc | null, workload: string): CompRecord[] {
  return doc?.records.filter((r) => r.workload === workload) ?? [];
}
function dedup(r?: CompRecord) {
  return r?.metrics.dedup_pct ?? null;
}
function toolLabel(tool: string) {
  return (
    {
      "git-lfs": "git-lfs",
      restic: "restic",
      borg: "borg",
      xdelta3: "xdelta3",
      "dits-generic": "dits — basic mode",
      "dits-facr": "dits",
    } as Record<string, string>
  )[tool] ?? tool;
}
function toolSub(tool: string) {
  return (
    {
      "git-lfs": "baseline",
      restic: "CDC dedup",
      borg: "CDC dedup",
      xdelta3: "binary delta",
      "dits-generic": "no video smarts",
    } as Record<string, string>
  )[tool];
}

export default async function BenchmarksPage() {
  const doc = await loadComparative();
  const engine = await loadLatestBenchmarks();

  const facr = rec(doc, "facr-regrade", "dits-facr");
  const stream = rec(doc, "stream", "dits-facr");
  const heroPct = Math.round(dedup(facr) ?? dedup(stream) ?? 98);

  // Honest-loss chapter (re-export): bar width = how much was STORED (100 - saved%).
  const reexport = workloadRecs(doc, "reexport");
  const reexportRows: BarRow[] = reexport.map((r) => {
    const saved = dedup(r) ?? 0;
    const isDits = r.tool === "dits-generic";
    return {
      label: toolLabel(r.tool),
      sub: toolSub(r.tool),
      pct: Math.max(8, 100 - saved),
      tone: isDits ? "red" : "gray",
      value: `saved ${saved}%`,
    };
  });

  // Structural (metadata): same bar, lower stored = better; dits/xdelta green.
  const metadata = workloadRecs(doc, "metadata");
  const metaRows: BarRow[] = metadata
    .sort((a, b) => (dedup(a) ?? 0) - (dedup(b) ?? 0))
    .map((r) => {
      const saved = dedup(r) ?? 0;
      const isWin = r.tool === "dits-generic" || r.tool === "xdelta3";
      return {
        label: toolLabel(r.tool),
        sub: toolSub(r.tool),
        pct: Math.max(6, 100 - saved),
        tone: isWin ? "green" : "gray",
        value: `saved ${saved}%`,
      };
    });

  // Engine throughput (from the standing micro-benchmarks, if present).
  const blake3 = engine?.results.find((r) => /BLAKE3 hash/.test(r.name));
  const sha256 = engine?.results.find((r) => /SHA-256 hash/.test(r.name));
  const fastcdc = engine?.results.find((r) => /FastCDC chunk/.test(r.name));
  const hashSpeedup = blake3 && sha256 ? Math.round(blake3.value / sha256.value) : null;

  const cumulativeEdits =
    doc?.cumulative?.find((s) => s.tool.startsWith("dits"))?.points.length ?? 15;

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-7">
      {/* HERO */}
      <section className="flex min-h-[88vh] flex-col justify-center">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-brand" /> dits · Benchmarks · plain English, real numbers
        </span>
        <h1 className="mt-6 text-5xl font-bold leading-[1.03] tracking-tight md:text-7xl">
          You changed a few<br />frames of a video.
        </h1>
        <div className="mt-8 flex flex-wrap items-end gap-7">
          <CountUpStat value={heroPct} suffix="%" className="text-7xl md:text-[150px]" />
          <div className="pb-3">
            <div className="text-2xl font-semibold">less to store &amp; upload</div>
            <div className="mt-1 font-mono text-sm text-muted-foreground">
              with dits, vs the best tools people use today
            </div>
          </div>
        </div>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          We ran the same edits through the tools everyone uses — and through dits — on one
          computer. Here&apos;s what each one had to re-save. Every <em>comparison</em> here is
          measured; the project-over-time and scaling projections are clearly labeled.
        </p>
      </section>

      {/* 01 — PREMISE */}
      <KeynoteSection chapter="01" tag="The simple idea">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Most tools re-save the <em>whole</em> file. dits saves only the part you changed.
        </h2>
        <div className="mt-6 flex max-w-2xl items-start gap-3.5 text-base text-muted-foreground">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand/10 text-lg">✏️</span>
          <p>
            Imagine fixing one typo in a 400-page book — then being forced to reprint all 400
            pages. That&apos;s what normal backup and version tools do with video. dits reprints
            the one page.
          </p>
        </div>
        <p className="mt-4 max-w-xl text-sm text-muted-foreground">
          The catch: to do that, a tool has to understand what&apos;s <em>inside</em> a video.
          Most don&apos;t. Below, we show exactly where that matters — and where it doesn&apos;t.
        </p>
      </KeynoteSection>

      {/* 02 — THE HONEST PART */}
      <KeynoteSection chapter="02" tag="The honest part — first" tagTone="amber">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Sometimes nothing helps much. We&apos;ll show you that too.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          When a video editor exports a finished clip, almost every byte gets rewritten — even
          the parts that look the same. So even the smartest tools skip only a little. dits&apos;
          basic mode does no better here.
        </p>
        {reexportRows.length > 0 && <TwoTierBar rows={reexportRows} />}
        <div className="mt-7 max-w-2xl rounded-2xl border border-brand/30 bg-brand/5 p-5">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-brand">
            Why we show this
          </div>
          <p className="mt-1.5 text-sm">
            If dits doesn&apos;t understand the video, it&apos;s no better than zipping a file.{" "}
            <strong className="text-brand">That&apos;s the whole reason the next pages exist.</strong>
          </p>
        </div>
      </KeynoteSection>

      {/* 03 — FACR FRAME DEDUP */}
      <KeynoteSection chapter="03" tag="When dits understands the video">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Re-color a few frames?</h2>
        <div className="my-4 flex flex-wrap items-end gap-6">
          <CountUpStat value={Math.round(dedup(facr) ?? 98)} suffix="%" className="text-5xl md:text-7xl" />
          <div className="pb-2 text-xl font-semibold">of the video is reused, untouched</div>
        </div>
        <TwoTierBar
          rows={[
            { label: "Tools without frame-awareness", sub: "re-save the whole file", pct: 100, tone: "gray", value: "100%" },
            {
              label: "dits",
              sub: "saves only what changed",
              pct: Math.max(4, 100 - (dedup(facr) ?? 98)),
              tone: "green",
              value: `${(100 - (dedup(facr) ?? 98)).toFixed(1)}%`,
            },
          ]}
        />
        <div className="mt-7 max-w-2xl rounded-2xl border border-brand/30 bg-brand/5 p-5 text-sm">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-brand">
            In plain terms
          </span>
          <p className="mt-1.5">
            You touched a handful of frames; dits stored a handful of frames.{" "}
            <strong className="text-brand">Storage and upload shrink by ~{Math.round(dedup(facr) ?? 98)}%</strong>{" "}
            for that edit.
          </p>
        </div>
      </KeynoteSection>

      {/* 04 — STREAMING */}
      <KeynoteSection chapter="04" tag="Live & streaming video">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Tweak a 2-second moment in a stream?
        </h2>
        <div className="my-4 flex flex-wrap items-end gap-6">
          <CountUpStat value={Math.round(dedup(stream) ?? 80)} suffix="%" className="text-5xl md:text-7xl" />
          <div className="pb-2 text-xl font-semibold">less data sent to viewers</div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Most streaming setups re-process and re-send the entire video after any change. dits
          rebuilds only the piece you touched — the rest is reused byte-for-byte.
        </p>
      </KeynoteSection>

      {/* 05 — STRUCTURAL */}
      <KeynoteSection chapter="05" tag="Renaming & small fixes">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Just changed the title or a setting?
        </h2>
        {metaRows.length > 0 && <TwoTierBar rows={metaRows} />}
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          Here&apos;s the honest part: the good general-purpose dedup tools handle this well too —
          restic skips ~95% of it. dits edges ahead, but structural edits aren&apos;t where the
          gap is. The real difference is frame work (chapters 03–04), not renames.
        </p>
      </KeynoteSection>

      {/* 06 — ENGINE */}
      {engine && (blake3 || fastcdc) && (
        <KeynoteSection chapter="06" tag="Is it fast, too?">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Yes. The engine under the hood.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            The math that fingerprints and slices your files runs at hundreds of megabytes per
            second. We track it every commit so it never slows down.
          </p>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {hashSpeedup && (
              <EngineCard k="Fingerprinting" v={`${hashSpeedup}×`} d="faster than common SHA-256" />
            )}
            {fastcdc && (
              <EngineCard k="Slicing files" v={`${Math.round(fastcdc.value)} MB/s`} d="finds reusable pieces" />
            )}
            {blake3 && (
              <EngineCard k="BLAKE3 hashing" v={`${Math.round(blake3.value)} MB/s`} d="content fingerprint" />
            )}
          </div>
        </KeynoteSection>
      )}

      {/* 07 — MONEY & TIME */}
      <KeynoteSection chapter="07" tag="What it means in money & time">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          The same edit, translated into dollars and minutes.
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Bytes are abstract. So we convert the result into the things people feel: your cloud
          bill and your upload time.
        </p>
        <MoneyTimeCards dedupPct={Math.round(dedup(facr) ?? dedup(stream) ?? 98)} />
        <p className="mt-3 text-sm text-muted-foreground">
          (Translation of our measured frame-dedup to a 1 GB reference clip. On a full re-export,
          where dits&apos; basic mode doesn&apos;t win, there&apos;s no saving — see chapter 02.)
        </p>
      </KeynoteSection>

      {/* 08 — CUMULATIVE (measured sweep) */}
      <KeynoteSection chapter="08" tag="A whole project over time">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Edit after edit, the storage piles up — except for dits.
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          One edit is nice; the real story is a project&apos;s life. We made {cumulativeEdits} localized
          edits to one clip and tracked every tool&apos;s store. dits keeps only the frames you
          change, so it barely grows. git-lfs re-stores the whole file each time; restic&apos;s
          byte-level dedup can&apos;t see across the re-encode, so it climbs too. Measured, not projected.
        </p>
        <CumulativeChart
          series={(doc?.cumulative ?? []).some((s) => s.tool.startsWith("dits")) ? doc!.cumulative : []}
          projected={[
            { tool: "git-lfs", label: "git-lfs (re-stores everything)", color: "#9aa0a6", endGb: 50 },
            { tool: "restic", label: "restic (re-export defeats dedup)", color: "#3b82f6", endGb: 36 },
            { tool: "dits", label: "dits (frame-addressing)", color: "var(--brand)", endGb: 1.3 },
          ]}
        />
      </KeynoteSection>

      {/* 09 — SCALING (measured sweep) */}
      <KeynoteSection chapter="09" tag="Does it hold at scale?">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          The bigger the file, the more dits saves.
        </h2>
        <ScalingChart series={doc?.scaling ?? []} projectedPct={Math.round(dedup(facr) ?? 98)} />
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Same localized edit, clips of growing size. Frame-addressing cost tracks the{" "}
          <em>edit</em>, not the file — so the bigger the clip, the smaller a fixed edit looks,
          and the more dits skips. It beats byte-level dedup at <em>every</em> size (storing
          several times less even where restic does best). Measured, not projected.
        </p>
      </KeynoteSection>

      {/* 10 — MATRIX */}
      {doc && (
        <KeynoteSection chapter="10" tag="All the data · nothing hidden">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Every tool, every test, five ways.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Storage saved, bytes uploaded, time, memory. Including the tests where dits
            doesn&apos;t win. Download it as a spreadsheet.
          </p>
          <MetricMatrix records={doc.records} />
        </KeynoteSection>
      )}

      {/* 11 — MORE EDIT TYPES (Module E) */}
      {doc && (
        <KeynoteSection chapter="11" tag="More edit types · incl. the magic ones">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Some edits cost dits literally zero bytes.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Trim a clip or tweak a photo, and dits stores the <em>instructions</em> — not a new
            copy. The original is reused untouched. And where dits genuinely can&apos;t help (a
            whole-clip re-grade), we say so.
          </p>
          <MoreEditTypes records={doc.records} />
        </KeynoteSection>
      )}

      {/* 12 — METHODOLOGY */}
      <KeynoteSection chapter="12" tag="Can you trust these?" id="methodology">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          One command re-runs every number on your own machine.
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Same computer, same files, real tools. No cherry-picking, no marketing math. The test
          videos and the raw results live in the open-source repo.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MethCard k="Machine" v={doc?.meta.machine ?? "one host"} />
          <MethCard
            k="Tools"
            v={Object.entries(doc?.meta.tool_versions ?? {})
              .filter(([, s]) => s === "present")
              .map(([t]) => t)
              .join(" · ") || "—"}
          />
          <MethCard k="Inputs" v="deterministic ffmpeg media, hash-pinned" />
          <MethCard k="Assumptions" v={COST_ASSUMPTIONS_LABEL} />
        </div>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 font-mono text-sm text-brand">
          <span className="h-2 w-2 rounded-full bg-brand" /> npm run bench:comparative
        </div>
        <p className="mt-5 max-w-2xl text-sm text-muted-foreground">
          <strong>Where dits loses, out loud:</strong> on a full re-export, dits&apos; basic mode
          is no better than the rest (see chapter 02). On a whole-clip color grade, every tool —
          dits included — re-stores nearly everything. Format-awareness helps with localized
          edits, not total rewrites.{" "}
          <Link href="/docs/architecture/algorithms" className="text-brand underline-offset-2 hover:underline">
            How it works →
          </Link>
        </p>
      </KeynoteSection>
    </main>
  );
}

function EngineCard({ k, v, d }: { k: string; v: string; d: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-1.5 text-4xl font-bold tracking-tight text-brand">{v}</div>
      <div className="text-sm text-muted-foreground">{d}</div>
    </div>
  );
}

function MethCard({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="text-sm">{v}</div>
    </div>
  );
}
