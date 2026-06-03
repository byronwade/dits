import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";
import { COST_ASSUMPTIONS } from "@/lib/bench-cost";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Benchmarks & Bandwidth Cost",
  description:
    "How much real money Dits' delta transfer saves on cloud egress vs Git-LFS — plus a link to the full reproducible benchmark suite.",
};

export default function DocsBenchmarksPage() {
  const egress = COST_ASSUMPTIONS.egress_usd_per_gb; // $0.09/GB S3/CloudFront transfer-out
  const b2 = 0.01; // Backblaze B2 transfer-out, for range
  const usd = (n: number) =>
    n >= 1
      ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
      : n >= 0.01
        ? `$${n.toFixed(2)}`
        : n > 0
          ? "< $0.01"
          : "$0.00";

  // Single-edit figures, sourced from the measured benchmarks (10 GB asset, ~200 KB delta).
  const assetGb = 10;
  const ditsDeltaGb = 200 / 1_048_576;

  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Reference"
        title="Benchmarks & bandwidth cost"
        description="Dits stores and transfers only the chunks that changed. Translated into cloud-egress dollars, here's what that delta transfer is worth — with a link to the full, reproducible benchmark suite."
      />

      <Callout type="tip" title="The short version" className="not-prose my-6">
        Whole-file tools (Git&nbsp;LFS, manual copies) move the entire asset on every change. Dits
        moves only the changed chunks. On a 10&nbsp;GB asset with a small edit, that&apos;s ~200&nbsp;KB
        instead of 10&nbsp;GB &mdash; about <strong>{usd(assetGb * egress)}</strong> of egress avoided{" "}
        <em>per distributed edit</em>, and it compounds with every pull. See the{" "}
        <Link href="/benchmarks#bandwidth-cost">full dollar breakdown and team scenario</Link>.
      </Callout>

      <h2>What costs money</h2>
      <p>
        Cloud providers bill for <strong>egress</strong> &mdash; data transferred <em>out</em>{" "}
        (downloads, pulls, CDN delivery). Uploads (transfer-in) are typically free. So the dollars
        accrue when a changed asset is <em>distributed</em>: every teammate who pulls the new version,
        or every viewer the CDN serves. With whole-file tooling, each of those is a full re-transfer.
        With Dits&apos; content-defined chunking and delta transfer, it&apos;s just the changed chunks.
      </p>

      <h2>Per-edit egress, priced</h2>
      <p className="text-sm">
        One localized edit to a 10&nbsp;GB asset. Byte figures come from the measured benchmarks; the
        only new math is multiplication (GB transferred × $/GB).
      </p>

      <div className="not-prose my-6 overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Per distributed edit</TableHead>
              <TableHead className="text-right tabular-nums">Data moved</TableHead>
              <TableHead className="text-right tabular-nums">@ $0.09/GB (S3)</TableHead>
              <TableHead className="text-right tabular-nums">@ $0.01/GB (B2)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Git&nbsp;LFS / manual</TableCell>
              <TableCell className="text-right tabular-nums">10 GB</TableCell>
              <TableCell className="text-right tabular-nums text-destructive">{usd(assetGb * egress)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{usd(assetGb * b2)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-brand">dits</TableCell>
              <TableCell className="text-right tabular-nums">~200 KB</TableCell>
              <TableCell className="text-right tabular-nums text-brand">{usd(ditsDeltaGb * egress)}</TableCell>
              <TableCell className="text-right tabular-nums text-brand">{usd(ditsDeltaGb * b2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Callout type="note" title="Methodology & honesty" className="not-prose my-6">
        Figures are estimates with stated assumptions. The byte counts are measured (10&nbsp;GB asset,
        ~200&nbsp;KB changed-chunk delta); the dollar values are those bytes × a cited egress rate
        (AWS&nbsp;S3 / CloudFront first-tier ${egress.toFixed(2)}/GB; Backblaze&nbsp;B2 ≈ ${b2.toFixed(2)}/GB
        for range). On a full re-export or whole-clip re-grade, almost every byte changes, so Dits saves
        little &mdash; we say so on the main page too.
      </Callout>

      <p>
        <Link href="/benchmarks">
          See the full benchmarks &mdash; reproducible, with the monthly team scenario and annual savings
          <ArrowRight className="ml-1 inline h-4 w-4 align-text-bottom" />
        </Link>
      </p>
    </div>
  );
}
