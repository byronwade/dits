import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Why Evaluate Dits - Fit, Trade-offs, and Alternatives",
  description:
    "When the Dits local alpha may be worth evaluating, when to keep Git LFS, Xet, Perforce, a cloud drive, or a review platform, and what Dits still must prove.",
  canonical: "https://dits.dev/docs/why-dits",
});

const alternatives = [
  {
    option: "Git",
    chooseWhen: "The repository is primarily code and text with modest binary assets.",
    ditsQuestion: "Does chunked large-asset history justify adding an immature tool?",
  },
  {
    option: "Git LFS",
    chooseWhen: "Hosting compatibility and a familiar pointer workflow matter most.",
    ditsQuestion: "Does reuse within changing binary content matter for the workload?",
  },
  {
    option: "Xet",
    chooseWhen: "Open Git-compatible CDC, CAS, deduplication, and large-data workflows fit the job.",
    ditsQuestion: "Can explicit media structure and derivation add value above that substrate?",
  },
  {
    option: "Perforce or Unity Version Control",
    chooseWhen: "The team needs mature locks, administration, partial workspaces, and support now.",
    ditsQuestion: "Is an open local-first format valuable enough for an early pilot?",
  },
  {
    option: "LucidLink, Frame.io, or a cloud drive",
    chooseWhen: "Fast access, review, approval, or simple sharing is the primary job.",
    ditsQuestion: "Does exact history and reproducible derivation solve a separate pain?",
  },
] as const;

export default function WhyDitsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Evaluation"
        title="Why evaluate Dits?"
        description="Dits is a focused experiment in open, local-first history for large media and asset pipelines—not a universal replacement for mature source, storage, or review systems."
      />

      <Callout type="warning" title="Alpha, not production-ready" className="not-prose my-6">
        Use a disposable or independently backed-up project and verify restored
        bytes. There is no working team remote, hosted service, or production
        support commitment.
      </Callout>

      <h2>The reason to try it</h2>

      <p>
        Try Dits if your project mixes Git-shaped history with large, frequently
        changing binary assets and you want to help test a model that can
        eventually connect exact source to edits, dependencies, and renditions.
        The present value is local history and storage experimentation; the
        differentiated long-term hypothesis is reproducible asset derivation.
      </p>

      <h2>The reason to wait</h2>

      <p>
        Wait if you need reliable multi-user synchronization, enterprise policy,
        broad format guarantees, supported plug-ins, service-level commitments,
        or proven performance at your scale. Established alternatives already
        provide many of those capabilities.
      </p>

      <h2>Choose for the job</h2>

      <div className="not-prose my-8 overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Option</TableHead>
              <TableHead>Choose it when</TableHead>
              <TableHead>Question Dits must answer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alternatives.map((alternative) => (
              <TableRow key={alternative.option}>
                <TableCell className="font-medium">{alternative.option}</TableCell>
                <TableCell>{alternative.chooseWhen}</TableCell>
                <TableCell>{alternative.ditsQuestion}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <h2>What Dits does not uniquely own</h2>

      <p>
        Content-defined chunking, a content-addressed store, chunk-level
        deduplication, Git integration, binary locks, streaming access, and review
        workflows all exist elsewhere. In particular, Xet already combines Git,
        CDC, CAS, and deduplication in an open Rust implementation.
      </p>

      <p>
        Dits earns differentiation only if an explicit media and asset graph makes
        outputs easier to reproduce, changes easier to understand, and derived
        storage easier to manage. That claim still needs public workflow evidence.
      </p>

      <h2>A good alpha evaluation</h2>

      <ol>
        <li>Choose disposable or independently backed-up representative data.</li>
        <li>Record the Dits version, filesystem, OS, file types, and commands.</li>
        <li>Commit controlled edits and inspect object-store growth.</li>
        <li>Check out every version and compare exact hashes.</li>
        <li>Interrupt operations and run integrity/recovery paths.</li>
        <li>Report favorable and unfavorable behavior with reproducible fixtures.</li>
      </ol>

      <Callout type="note" title="Continue" className="not-prose my-8">
        Read the <Link href="/docs/getting-started">getting-started guide</Link>,
        the <Link href="/docs/roadmap">status and roadmap</Link>, and the
        <Link href="/benchmarks">benchmark limitations</Link> before evaluating.
      </Callout>
    </div>
  );
}
