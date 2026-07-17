import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, GitBranch, Layers, Terminal, Waypoints } from "lucide-react";

import { DocPageHeader } from "@/components/doc-page-header";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits Documentation - Local Alpha and Product Design",
  description:
    "Documentation for the Dits local alpha, including getting started, CLI reference, concepts, architecture, maturity, and roadmap.",
  canonical: "https://dits.dev/docs",
});

const sections = [
  {
    icon: BookOpen,
    title: "Getting started",
    description: "Install the npm-packaged CLI and evaluate a local repository safely.",
    href: "/docs/getting-started",
    label: "Start here",
  },
  {
    icon: Terminal,
    title: "CLI reference",
    description: "Commands and flags generated or checked against the current binary.",
    href: "/docs/cli-reference",
    label: "Current",
  },
  {
    icon: Layers,
    title: "Core concepts",
    description: "Objects, chunks, manifests, refs, hybrid storage, and exact recovery.",
    href: "/docs/concepts",
    label: "Current",
  },
  {
    icon: GitBranch,
    title: "Active architecture",
    description: "The live Rust CLI boundary, dependency direction, and quarantined history.",
    href: "/docs/architecture",
    label: "Authority",
  },
  {
    icon: Waypoints,
    title: "Status and roadmap",
    description: "What is current, experimental, roadmap, or historical—and the gates between them.",
    href: "/docs/roadmap",
    label: "Read before adopting",
  },
] as const;

export default function DocsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Documentation"
        title="Build from product truth"
        description="Dits is an open, local-first version-control alpha for large media and asset pipelines. These docs separate current behavior from experiments and future design."
      />

      <Callout type="warning" title="Alpha safety" className="not-prose my-6">
        Use Dits only on disposable or independently backed-up projects. Verify
        restored files. Network <code>push</code>, <code>pull</code>, <code>fetch</code>,
        <code> sync</code>, network clone, and P2P transfer are not implemented.
      </Callout>

      <div className="not-prose my-10 grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full transition-colors hover:border-brand/40">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <section.icon className="size-6 text-brand" aria-hidden="true" />
                  <Badge variant="secondary">{section.label}</Badge>
                </div>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <h2>How to read these docs</h2>

      <p>
        Capability labels are contracts: <strong>Current</strong> means a real local
        command path with relevant tests; <strong>Experimental</strong> means runnable
        but unstable or incompletely validated; <strong>Roadmap</strong> is not
        implemented; and <strong>Historical</strong> is retained context rather than
        current architecture.
      </p>

      <h2>Current product boundary</h2>

      <ul>
        <li>The canonical engine is the Rust workspace under <code>apps/cli</code>.</li>
        <li>Local history, chunk storage, and exact checkout are the core alpha claim.</li>
        <li>MP4, FACR, photo, proxy, VFS, and semantic graph paths need broader proof.</li>
        <li>The former backend under <code>legacy/backend-crates</code> is historical.</li>
        <li>API, SDK, P2P, cloud, and deployment pages describe design unless explicitly promoted.</li>
      </ul>

      <Callout type="note" title="Evidence standard" className="not-prose my-8">
        A performance or compatibility claim should name its fixture, method,
        environment, Dits commit, and raw artifact. Component microbenchmarks do
        not establish end-to-end repository performance.
      </Callout>
    </div>
  );
}
