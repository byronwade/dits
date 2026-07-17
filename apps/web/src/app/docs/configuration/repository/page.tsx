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
  title: "Repository Configuration",
  description: "Repository-local Dits configuration and chunking settings",
};

const chunkingKeys = [
  { key: "chunking.min_size", defaultValue: "16KB", role: "Minimum chunk size" },
  {
    key: "chunking.target_size",
    defaultValue: "64KB",
    role: "Target/average chunk size",
  },
  { key: "chunking.max_size", defaultValue: "256KB", role: "Maximum chunk size" },
];

export default function RepositoryConfigPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Configuration"
        title="Repository Configuration"
        description="Repository-local settings live in .dits/config.toml; chunking is the active runtime use."
      />

      <h2>Location and selection</h2>
      <CodeBlock
        language="text"
        code={`my-project/
├── .dits/
│   ├── config.toml     # Managed by dits config
│   ├── remotes         # Separate remote metadata
│   └── ...
└── ...`}
      />
      <p>
        While inside a repository, <code>dits config</code> selects{" "}
        <code>.dits/config.toml</code> unless <code>--global</code> is present. There is
        no <code>--local</code> flag and no layered merge with global settings.
      </p>

      <h2>Chunking configuration</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chunkingKeys.map((item) => (
            <TableRow key={item.key}>
              <TableCell className="font-mono text-sm">{item.key}</TableCell>
              <TableCell className="font-mono text-sm">{item.defaultValue}</TableCell>
              <TableCell>{item.role}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CodeBlock
        language="bash"
        code={`dits config chunking.min_size 32KB
dits config chunking.target_size 128KB
dits config chunking.max_size 512KB
dits config --list`}
      />
      <Callout type="warning" title="Preserve valid bounds" className="not-prose my-6">
        Keep <code>min_size &lt;= target_size &lt;= max_size</code>. The parser accepts
        individual sizes but does not yet validate the relationship among them. Changing
        chunking parameters can also reduce deduplication with objects created under a
        different profile.
      </Callout>

      <h2>Stored-only repository keys</h2>
      <p>
        The repository file can also store <code>user.name</code>,{" "}
        <code>user.email</code>, <code>core.default_branch</code>, and{" "}
        <code>core.verbose</code>. They are not currently connected to commit identity,
        branch initialization, or command verbosity.
      </p>
      <CodeBlock
        language="toml"
        code={`[core]
default_branch = "main"
verbose = false

[chunking]
target_size = 131072
min_size = 32768
max_size = 524288`}
      />

      <h2>Separate repository metadata</h2>
      <p>
        Remote names and URLs do not live in this TOML document. Manage their JSON file
        with <code>dits remote</code>:
      </p>
      <CodeBlock
        language="bash"
        code={`dits remote add origin /path/to/another-repository
dits remote --verbose`}
      />
      <p>
        Recording a remote works, but <code>push</code>, <code>pull</code>,{" "}
        <code>fetch</code>, and <code>sync</code> fail closed without transferring data
        in this alpha. Sparse-checkout also uses a separate <code>.dits/config</code>{" "}
        file; it is not managed by <code>dits config</code>.
      </p>

      <h2>Unsupported repository settings</h2>
      <p>
        File-mode, line-ending, compression, media, cache, hook-enable, branch-tracking,
        and remote-refspec sections are design-only and are rejected by the current
        dot-notation setter.
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
          <Link href="/docs/configuration/env">Environment variables</Link>
        </li>
      </ul>
    </div>
  );
}
