import { Metadata } from "next";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Environment Variables",
  description: "Environment variables actually read or supplied by the Dits alpha",
};

const identityLookups = [
  {
    value: "Commit author name",
    order: "DITS_AUTHOR_NAME → GIT_AUTHOR_NAME → USER → Unknown",
  },
  {
    value: "Commit author email",
    order: "DITS_AUTHOR_EMAIL → GIT_AUTHOR_EMAIL → <name>@localhost",
  },
];

export default function EnvVarsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Configuration"
        title="Environment Variables"
        description="The current CLI reads author identity variables; it does not implement general environment-based configuration overrides."
      />

      <Callout type="important" title="No environment config layer" className="not-prose my-6">
        Environment variables do not override arbitrary TOML keys. Directory, cache,
        editor, pager, trace, token, and server variables documented in older drafts are
        not read by the current CLI.
      </Callout>

      <h2>Commit identity</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Value</TableHead>
            <TableHead>Lookup order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {identityLookups.map((item) => (
            <TableRow key={item.value}>
              <TableCell>{item.value}</TableCell>
              <TableCell className="font-mono text-sm">{item.order}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CodeBlock
        language="bash"
        code={`export DITS_AUTHOR_NAME="CI Bot"
export DITS_AUTHOR_EMAIL="ci@example.com"

dits add output.mov
dits commit -m "Record generated output"`}
      />
      <p>
        <code>DITS_AUTHOR_DATE</code> and <code>DITS_COMMITTER_*</code> are not read. A
        commit currently uses the same resolved identity for author and committer and
        records the current time.
      </p>

      <h2>Lock owner lookup</h2>
      <p>
        Advisory lock commands first ask Git for <code>user.email</code>, then fall back
        to <code>USER</code> or <code>USERNAME</code>. This lookup is separate from Dits
        TOML configuration.
      </p>

      <h2>Hook context supplied by Dits</h2>
      <p>When Dits starts a hook process, it supplies:</p>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Variable</TableHead>
            <TableHead>Meaning</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">DITS_DIR</TableCell>
            <TableCell>The current repository&apos;s .dits directory</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-mono">DITS_HOOK</TableCell>
            <TableCell>The hook filename being executed</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <p>
        These are output context for hook subprocesses. Setting <code>DITS_DIR</code>
        before invoking Dits does not redirect repository discovery.
      </p>

      <h2>Not implemented</h2>
      <p>
        The current alpha does not read <code>DITS_WORK_TREE</code>,{" "}
        <code>DITS_CACHE_DIR</code>, <code>DITS_CONFIG_GLOBAL</code>,{" "}
        <code>DITS_CONFIG_SYSTEM</code>, <code>DITS_EDITOR</code>,{" "}
        <code>DITS_PAGER</code>, <code>DITS_SSH_COMMAND</code>,{" "}
        <code>DITS_TRACE*</code>, <code>DITS_DEBUG</code>, <code>DITS_TOKEN</code>, or{" "}
        <code>DITS_SERVER</code>. Support for those names is design work unless and until
        it is implemented and tested.
      </p>

      <h2>Related topics</h2>
      <ul>
        <li>
          <Link href="/docs/configuration">Configuration overview</Link>
        </li>
        <li>
          <Link href="/docs/configuration/global">Global configuration</Link>
        </li>
        <li>
          <Link href="/docs/configuration/repository">Repository configuration</Link>
        </li>
      </ul>
    </div>
  );
}
