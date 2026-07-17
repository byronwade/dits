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

export const metadata: Metadata = {
  title: "Experimental Local Lifecycle Storage",
  description:
    "Current local freeze/thaw experiment and its boundary: no cloud tiering, transparent remote hydration, cost model, or access-time guarantee.",
};

const tiers = [
  { name: "Hot", path: ".dits/objects", behavior: "Normal local chunk location" },
  { name: "Warm", path: ".dits/warm", behavior: "Local filesystem directory; bytes are moved, not uploaded" },
  { name: "Cold", path: ".dits/cold", behavior: "Local filesystem directory; no provider retrieval contract" },
  { name: "Archive", path: ".dits/archive", behavior: "Locally compressed chunks with a simulated thaw queue" },
];

export default function StorageTiersPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Experimental Storage"
        title="Local Lifecycle Storage"
        description="Freeze and thaw move chunks among directories inside one local repository. Tier names do not represent managed cloud services."
      />

      <Callout type="warning" title="This experiment moves local repository bytes" className="not-prose my-6">
        Freeze can rename chunks out of <code>.dits/objects</code> or compress and
        remove the hot copy for the archive tier. Normal access may require an
        explicit thaw. Use only on disposable or independently backed-up
        repositories, and verify restored files after every lifecycle test.
      </Callout>

      <h2>What the tier names mean today</h2>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Local path</TableHead>
            <TableHead>Current behavior</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiers.map((tier) => (
            <TableRow key={tier.name}>
              <TableCell>{tier.name}</TableCell>
              <TableCell className="font-mono text-sm">{tier.path}</TableCell>
              <TableCell>{tier.behavior}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p>
        These labels drive local tracking and movement. They do not configure
        AWS S3 or Glacier, Google Cloud Storage, Azure Blob, Backblaze, a remote
        cache, or a hosted lifecycle worker. There is no provider billing,
        replication, region, durability, or retrieval-time integration.
      </p>

      <h2>Policy experiment</h2>

      <p>
        Dits includes three local policy presets: <code>default</code>,
        <code> aggressive</code>, and <code>conservative</code>. A policy evaluates
        locally tracked access timestamps and can be applied explicitly with
        <code> dits freeze --apply-policy</code>. There is no background daemon or
        hosted scheduler moving content automatically.
      </p>

      <h2>No access-speed promise</h2>

      <p>
        &ldquo;Hot,&rdquo; &ldquo;warm,&rdquo; &ldquo;cold,&rdquo; and
        &ldquo;archive&rdquo; are lifecycle labels, not latency classes. Dits does not
        promise instant local access, a cloud retrieval window, transparent
        hydration, playback performance, or a cost level for any tier.
      </p>

      <h2>Future cloud-tier requirements</h2>

      <ul>
        <li>Verified upload, download, retry, resume, and object-integrity semantics.</li>
        <li>Credential isolation, encryption design, provider compatibility, and region policy.</li>
        <li>Durability, retention, deletion, restore, billing, and failure contracts backed by tests.</li>
        <li>Safe fallback when a remote provider or network is unavailable.</li>
      </ul>

      <p>
        See the <Link href="/docs/cli/storage">current local command syntax</Link>,
        <Link href="/docs/cli/maintenance"> integrity diagnostics</Link>, and
        <Link href="/docs/roadmap"> status and roadmap</Link>.
      </p>
    </div>
  );
}
