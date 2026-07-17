import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Local Metadata Commands",
  description: "Current local metadata scan, show, and list syntax with extractor limits.",
};

const commands = [
  { command: "meta-scan", usage: "dits meta-scan [-v|--verbose]", behavior: "Scan files in HEAD and store local metadata by content hash" },
  { command: "meta-show", usage: "dits meta-show <PATH>", behavior: "Print previously stored metadata for one HEAD path as JSON" },
  { command: "meta-list", usage: "dits meta-list", behavior: "List the metadata records in the local store" },
];

export default function MetadataCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference · Current"
        title="Local metadata commands"
        description="Build and inspect a derived metadata cache for files in the current HEAD snapshot."
      />

      <Callout type="note" title="Derived local data" className="not-prose my-6">
        Metadata records are a local cache, not commit contents, a hosted catalog, or
        a stable public schema. Preserve the source file as the authority.
      </Callout>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Command</TableHead>
            <TableHead>Current behavior</TableHead>
            <TableHead>Exact syntax</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commands.map((item) => (
            <TableRow key={item.command}>
              <TableCell className="font-mono font-medium">{item.command}</TableCell>
              <TableCell>{item.behavior}</TableCell>
              <TableCell className="font-mono text-sm">{item.usage}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CodeBlock
        language="bash"
        code={`# Extract missing metadata records for files in HEAD
dits meta-scan
dits meta-scan --verbose

# Read a record after scanning
dits meta-show footage/scene.mp4

# List local record IDs and basic type information
dits meta-list`}
      />

      <h2>Extractor boundary</h2>
      <p>
        When available, <code>ffprobe</code> supplies selected video fields and{" "}
        <code>exiftool</code> supplies selected photo fields. Otherwise Dits falls
        back to basic file metadata. Tool availability, format support, and malformed
        input can change the fields present.
      </p>
      <p>
        <code>meta-scan</code> reads the HEAD manifest, skips records already cached,
        and skips a source that is not present in the working tree.{" "}
        <code>meta-show</code> does not extract on demand; run the scan first.
      </p>

      <h2>Options that do not exist</h2>
      <p>
        The scan has no path operands, recursive switch, type filter, jobs setting,
        force-refresh, or JSON flag. <code>meta-show</code> accepts one exact
        repository-relative HEAD path and no field selector. <code>meta-list</code>
        has no filters or alternate output format.
      </p>

      <Callout type="warning" title="Do not use metadata as integrity evidence" className="not-prose my-6">
        Metadata extraction is descriptive and tool-dependent. Use{" "}
        <code>dits fsck</code> for the bounded repository integrity checks and compare
        important media in its authoring or playback tool.
      </Callout>

      <p>
        See <Link href="/docs/cli/maintenance">maintenance commands</Link> and{" "}
        <Link href="/docs/cli/video">video experiments</Link>.
      </p>
    </div>
  );
}
