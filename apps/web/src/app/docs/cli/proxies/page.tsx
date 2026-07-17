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
  title: "Experimental Local Proxy Commands",
  description: "Exact local proxy-generation syntax, dependencies, and alpha limits.",
};

const commands = [
  { command: "proxy-generate", usage: "dits proxy-generate [FILES]... [OPTIONS]", behavior: "Generate local derived variants with FFmpeg/FFprobe" },
  { command: "proxy-status", usage: "dits proxy-status", behavior: "Summarize the local proxy store" },
  { command: "proxy-list", usage: "dits proxy-list [-v|--verbose]", behavior: "List local generated variants" },
  { command: "proxy-delete", usage: "dits proxy-delete [FILES]... [--all]", behavior: "Delete matching local derived variants" },
];

export default function ProxyCommandsPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="CLI Reference · Experimental"
        title="Local proxy commands"
        description="Create and manage derived local video variants while keeping originals authoritative."
      />

      <Callout type="warning" title="Preserve every original" className="not-prose my-6">
        Proxy commands are an FFmpeg-backed experiment. A proxy is derived media,
        not a source master, backup, stable interchange format, or fidelity guarantee.
      </Callout>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Command</TableHead>
            <TableHead>Experimental behavior</TableHead>
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

      <h2>Generate</h2>
      <CodeBlock
        language="text"
        code={`dits proxy-generate [FILES]... [OPTIONS]

Options:
-r, --resolution <VALUE>   1080, 720, 540, half, or quarter
-c, --codec <VALUE>        h264, h265, prores, prores-lt, dnxhr, or dnxhr-sq
-p, --preset <VALUE>       fast, hq, or offline
    --all                  Use recognized video files tracked in HEAD`}
      />
      <CodeBlock
        language="bash"
        code={`dits proxy-generate footage/scene.mp4 --preset fast
dits proxy-generate footage/scene.mov --resolution 720 --codec h264
dits proxy-generate --all --preset offline`}
      />
      <p>
        Generation requires both <code>ffmpeg</code> and <code>ffprobe</code> on
        <code> PATH</code>. With <code>--all</code>, Dits selects its current
        extension-bounded set of tracked video paths from HEAD. Without files or
        <code> --all</code>, the command fails.
      </p>

      <h2>Inspect and delete local variants</h2>
      <CodeBlock
        language="bash"
        code={`dits proxy-status
dits proxy-list
dits proxy-list --verbose

dits proxy-delete footage/scene.mp4
dits proxy-delete --all`}
      />
      <p>
        Delete operates only on the local derived proxy store and does not delete
        the original tracked file. It is still destructive for generated variants,
        so inspect the list first.
      </p>

      <h2>What this is not</h2>
      <p>
        There is no remote proxy upload, partial clone, on-demand hydration,
        background queue, cloud cache, automatic generation on commit, quality
        guarantee, or cross-device synchronization. Flags for jobs, force, custom
        bitrate, output directory, JSON, and watch mode do not exist.
      </p>

      <p>
        See <Link href="/docs/cli/video">video experiments</Link> and use{" "}
        <code>dits proxy-generate --help</code> for parser-authoritative syntax.
      </p>
    </div>
  );
}
