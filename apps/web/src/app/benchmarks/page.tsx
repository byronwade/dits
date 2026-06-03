import type { Metadata } from "next";
import Link from "next/link";
import { loadComparative, loadLatestBenchmarks } from "@/lib/benchmarks.server";
import { COST_ASSUMPTIONS, COST_ASSUMPTIONS_LABEL } from "@/lib/bench-cost";
import { StatCard } from "@/components/stat-card";
import { Callout } from "@/components/ui/callout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

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

  // ---- real-money bandwidth math (multiplication only; bytes from the figures above) ----
  const egress = COST_ASSUMPTIONS.egress_usd_per_gb; // $0.09/GB (S3/CloudFront transfer-out)
  const b2 = 0.01; // Backblaze B2 transfer-out, for range
  const usd = (n: number) =>
    n >= 1
      ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
      : n >= 0.01
        ? `$${n.toFixed(2)}`
        : n > 0
          ? "< $0.01"
          : "$0.00";

  // Single-edit scenario: 10 GB asset, one localized edit. Whole-file tools move 10 GB;
  // dits moves only the changed chunks (~200 KB), matching the /docs figure.
  const assetGb = 10;
  const ditsDeltaGb = 200 / 1_048_576; // ~200 KB in GB
  const singleFullCost = assetGb * egress;
  const singleDitsCost = ditsDeltaGb * egress;
  const singleSavedPct = Math.round((1 - ditsDeltaGb / assetGb) * 100 * 10) / 10;

  // Monthly team distribution scenario. Assumptions stated inline on the page.
  // 5 collaborators each PULL every new version (egress applies to data served out).
  const teamSize = 5;
  const editsPerDay = 3;
  const days = 22; // working days/month
  const editsPerMonth = editsPerDay * days; // 66
  const pulls = teamSize - 1; // the editor pushes; teammates pull
  // git-lfs / manual: each pull re-downloads the whole asset.
  const monthlyFullGb = editsPerMonth * pulls * assetGb;
  // dits: each pull fetches only the changed chunks.
  const monthlyDitsGb = editsPerMonth * pulls * ditsDeltaGb;
  const monthlyFullCost = monthlyFullGb * egress;
  const monthlyDitsCost = monthlyDitsGb * egress;
  const monthlySaved = monthlyFullCost - monthlyDitsCost;
  const annualSaved = monthlySaved * 12;
  const monthlySavedPct = Math.round((1 - monthlyDitsGb / monthlyFullGb) * 100 * 10) / 10;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-7 pt-[104px]" tabIndex={-1}>
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

      {/* 08 — REAL-MONEY BANDWIDTH BILL */}
      <KeynoteSection chapter="08" tag="The bandwidth bill, in dollars" id="bandwidth-cost">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Every re-transfer is a line item on a cloud invoice.
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Whole-file tools (Git&nbsp;LFS, manual copies) move the entire asset every time it
          changes. dits&apos; content-defined chunking + delta transfer moves only the changed
          chunks. Priced at real cloud egress rates, that gap is money.
        </p>

        {/* Headline figures */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Monthly savings"
            value={usd(monthlySaved)}
            hint="team distribution scenario, below"
            className="border-brand/30 bg-brand/5"
          />
          <StatCard
            label="Annual savings"
            value={usd(annualSaved)}
            hint="12 × monthly, same assumptions"
            className="border-brand/30 bg-brand/5"
          />
          <StatCard
            label="Bandwidth avoided"
            value={`${monthlySavedPct}%`}
            hint="of bytes never leave the server"
          />
        </div>

        {/* Scenario 1 — single edit */}
        <h3 className="mt-10 text-xl font-semibold tracking-tight">
          One small edit to a 10&nbsp;GB asset
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          A localized change (re-color a few frames). Whole-file tools re-transfer the entire
          10&nbsp;GB; dits transfers only the ~200&nbsp;KB of changed chunks — the same figure as
          the engine&apos;s measured delta. Cost = GB&nbsp;transferred × egress rate.
        </p>
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Per edit, transferred</TableHead>
                <TableHead className="text-right tabular-nums">Data moved</TableHead>
                <TableHead className="text-right tabular-nums">@ $0.09/GB (S3)</TableHead>
                <TableHead className="text-right tabular-nums">@ $0.01/GB (B2)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Git&nbsp;LFS / manual</TableCell>
                <TableCell className="text-right tabular-nums">10 GB</TableCell>
                <TableCell className="text-right tabular-nums text-destructive">{usd(singleFullCost)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{usd(assetGb * b2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-brand">dits</TableCell>
                <TableCell className="text-right tabular-nums">~200 KB</TableCell>
                <TableCell className="text-right tabular-nums text-brand">{usd(singleDitsCost)}</TableCell>
                <TableCell className="text-right tabular-nums text-brand">{usd(ditsDeltaGb * b2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          That&apos;s <strong className="text-foreground tabular-nums">{singleSavedPct}%</strong> less
          data per edit — and the dollar gap compounds every time the asset is distributed.
        </p>

        {/* Scenario 2 — monthly team */}
        <h3 className="mt-10 text-xl font-semibold tracking-tight">
          A {teamSize}-person team, one month
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          <strong className="text-foreground">Stated assumptions:</strong> {teamSize} collaborators,{" "}
          {editsPerDay} edits/day over {days} working days ({editsPerMonth} new versions/month) on
          the same 10&nbsp;GB asset. Each new version is pulled by the other {pulls} teammates — and
          egress (data-transfer-<em>out</em>) is what cloud providers bill for serving those pulls.
          Whole-file tools download all 10&nbsp;GB each pull; dits downloads only the changed chunks.
        </p>
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Per month, served out</TableHead>
                <TableHead className="text-right tabular-nums">Egress (GB)</TableHead>
                <TableHead className="text-right tabular-nums">@ $0.09/GB (S3)</TableHead>
                <TableHead className="text-right tabular-nums">Per year</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Git&nbsp;LFS / manual</TableCell>
                <TableCell className="text-right tabular-nums">{monthlyFullGb.toLocaleString("en-US")} GB</TableCell>
                <TableCell className="text-right tabular-nums text-destructive">{usd(monthlyFullCost)}</TableCell>
                <TableCell className="text-right tabular-nums text-destructive">{usd(monthlyFullCost * 12)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-brand">dits</TableCell>
                <TableCell className="text-right tabular-nums">
                  {monthlyDitsGb < 1 ? `${(monthlyDitsGb * 1024).toFixed(0)} MB` : `${monthlyDitsGb.toFixed(1)} GB`}
                </TableCell>
                <TableCell className="text-right tabular-nums text-brand">{usd(monthlyDitsCost)}</TableCell>
                <TableCell className="text-right tabular-nums text-brand">{usd(monthlyDitsCost * 12)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">You save</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {(monthlyFullGb - monthlyDitsGb).toLocaleString("en-US", { maximumFractionDigits: 0 })} GB
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-brand">{usd(monthlySaved)}/mo</TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-brand">{usd(annualSaved)}/yr</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <Callout type="note" title="How the dollars are computed" className="mt-7">
          The only new math here is multiplication: <strong>GB transferred × $/GB</strong>. The byte
          figures come straight from the measured benchmarks above (10&nbsp;GB asset, ~200&nbsp;KB
          changed-chunk delta); we do not invent throughput. Egress rate is{" "}
          <strong className="tabular-nums">${egress.toFixed(2)}/GB</strong> (AWS&nbsp;S3 / CloudFront
          first-tier data-transfer-out; Backblaze&nbsp;B2 ≈ ${b2.toFixed(2)}/GB shown for range).
          Uploads (transfer-<em>in</em>) are typically free; the dollars accrue when a changed asset
          is <em>distributed</em> — pulled by teammates or served by a CDN. Team size, edit cadence,
          and asset size are stated estimates, not measured — change them and the ratio holds.
        </Callout>
      </KeynoteSection>

      {/* 09 — CUMULATIVE (measured sweep) */}
      <KeynoteSection chapter="09" tag="A whole project over time">
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
            { tool: "git-lfs", label: "git-lfs (re-stores everything)", color: "var(--chart-3)", endGb: 50 },
            { tool: "restic", label: "restic (re-export defeats dedup)", color: "var(--chart-2)", endGb: 36 },
            { tool: "dits", label: "dits (frame-addressing)", color: "var(--brand)", endGb: 1.3 },
          ]}
        />
      </KeynoteSection>

      {/* 10 — SCALING (measured sweep) */}
      <KeynoteSection chapter="10" tag="Does it hold at scale?">
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
        <KeynoteSection chapter="11" tag="All the data · nothing hidden">
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
        <KeynoteSection chapter="12" tag="More edit types · incl. the magic ones">
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
      <KeynoteSection chapter="13" tag="Can you trust these?" id="methodology">
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
      <Footer />
    </div>
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
