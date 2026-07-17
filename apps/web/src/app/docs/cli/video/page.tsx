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
  title: "Experimental Video Commands",
  description:
    "Exact syntax and fidelity boundaries for local MP4, segmentation, and timeline experiments.",
};

const commands = [
  { command: "inspect", usage: "dits inspect <FILE>", behavior: "Parse a selected MP4/ISOBMFF file and run an in-memory structural roundtrip check" },
  { command: "roundtrip", usage: "dits roundtrip <INPUT> <OUTPUT>", behavior: "Write a structure-aware reconstruction for inspection" },
  { command: "segment", usage: "dits segment <FILE> [-o|--output <DIR>] [-d|--duration <SECONDS>]", behavior: "Create FFmpeg GOP-aligned MP4 segments and manifest.json" },
  { command: "assemble", usage: "dits assemble <SEGMENTS_DIR> <OUTPUT>", behavior: "Assemble local segments described by manifest.json" },
  { command: "inspect-file", usage: "dits inspect-file <PATH> [--chunks]", behavior: "Inspect current tracked storage information" },
  { command: "video-init", usage: "dits video-init <NAME>", behavior: "Create an experimental local timeline record" },
  { command: "video-add-clip", usage: "dits video-add-clip <PROJECT> --file <PATH> --in <S> --out <S> --start <S> [--track <ID>]", behavior: "Add one tracked HEAD path to a timeline" },
  { command: "video-show", usage: "dits video-show <NAME>", behavior: "Print one local timeline" },
  { command: "video-list", usage: "dits video-list", behavior: "List local timeline records" },
];

export default function VideoCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference · Experimental"
        title="Video and timeline experiments"
        description="Evaluate selected local media workflows without treating derived output or parser results as source truth."
      />

      <Callout type="warning" title="Preserve the original media" className="not-prose my-6">
        Format coverage is fixture-bounded. Structure-aware reconstruction and
        FFmpeg segmentation can produce files that are not byte-identical to the
        input. Keep the source master and verify every output in an independent tool.
      </Callout>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Command</TableHead>
            <TableHead>Current alpha behavior</TableHead>
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

      <h2>Container inspection and reconstruction</h2>
      <CodeBlock
        language="bash"
        code={`dits inspect footage/scene.mp4
dits roundtrip footage/scene.mp4 /tmp/scene-rebuilt.mp4

# Generic tracked-file storage inspection is a separate current command
dits inspect-file footage/scene.mp4
dits inspect-file footage/scene.mp4 --chunks`}
      />
      <p>
        <code>inspect</code> has no JSON, atoms-only, keyframe, tracks, or verbose
        flags. It prints the structure understood by the current MP4 parser and an
        internal structural roundtrip result. <code>roundtrip</code> normalizes
        <code> moov</code> data and reports when the output is not byte-identical.
      </p>

      <h2>Segmentation and assembly</h2>
      <CodeBlock
        language="bash"
        code={`# FFmpeg is required
dits segment footage/scene.mp4
dits segment footage/scene.mp4 --output scene-segments --duration 4

# The directory must already contain manifest.json and every local segment
dits assemble scene-segments scene-assembled.mp4`}
      />
      <p>
        Segment duration defaults to two seconds. This command invokes FFmpeg to
        make GOP-aligned MP4 segments; it does not expose FastCDC size controls, a
        dry run, progress switch, or keyframe toggle. Assemble has no remote fetch,
        parallel-download, force, or byte-verification flag.
      </p>

      <h2>Local timeline records</h2>
      <CodeBlock
        language="bash"
        code={`dits video-init rough-cut
dits video-add-clip rough-cut --file footage/scene.mp4 --in 0 --out 12.5 --start 0
dits video-show rough-cut
dits video-list`}
      />
      <p>
        Timeline records live in local <code>.dits</code> project storage and are
        not yet integrated into commit manifests, remote collaboration, or an NLE
        interchange contract. Clip paths must already be tracked in HEAD.
      </p>

      <Callout type="note" title="No universal media semantics" className="not-prose my-6">
        These commands do not promise support for every MP4/MOV/MXF variant, semantic
        edit identity, frame-level merge, remote partial retrieval, or a particular
        deduplication percentage.
      </Callout>

      <p>
        See <Link href="/docs/cli/proxies">proxy experiments</Link>,{" "}
        <Link href="/docs/cli/metadata">metadata commands</Link>, and runtime help
        for the exact installed surface.
      </p>
    </div>
  );
}
