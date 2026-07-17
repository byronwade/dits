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
  title: "Configuration",
  description: "Current-alpha Dits configuration files, keys, and runtime effects",
};

const configKeys = [
  {
    key: "user.name",
    defaultValue: "unset",
    effect: "Stored preference; commits do not read it yet",
  },
  {
    key: "user.email",
    defaultValue: "unset",
    effect: "Stored preference; commits do not read it yet",
  },
  {
    key: "core.default_branch",
    defaultValue: "main",
    effect: "Stored preference; repository init still uses main",
  },
  {
    key: "core.verbose",
    defaultValue: "false",
    effect: "Stored preference; not a global verbosity flag",
  },
  {
    key: "chunking.target_size",
    defaultValue: "64KB",
    effect: "Repository-local target chunk size",
  },
  {
    key: "chunking.min_size",
    defaultValue: "16KB",
    effect: "Repository-local minimum chunk size",
  },
  {
    key: "chunking.max_size",
    defaultValue: "256KB",
    effect: "Repository-local maximum chunk size",
  },
  {
    key: "telemetry.enabled",
    defaultValue: "false",
    effect: "Global opt-in telemetry switch",
  },
];

export default function ConfigurationPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Configuration"
        title="Configuration"
        description="The current alpha selects one TOML file and exposes a small, explicit key set."
      />

      <Callout type="important" title="No layered stack yet" className="not-prose my-6">
        Dits does not currently merge system, global, repository, environment, and
        command-line layers. It selects either the repository file or the global file.
        Older Git-like configuration examples are design material, not supported syntax.
      </Callout>

      <h2>Configuration files</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Scope</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Selection</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Repository</TableCell>
            <TableCell className="font-mono text-sm">.dits/config.toml</TableCell>
            <TableCell>Default while inside a repository</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Global</TableCell>
            <TableCell className="font-mono text-sm">
              &lt;platform config directory&gt;/dits/config.toml
            </TableCell>
            <TableCell>Pass --global</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <p>
        There is no system or worktree level. Inside a repository, an unqualified
        operation reads only <code>.dits/config.toml</code>. Outside a repository,
        keyed operations require <code>--global</code>; a bare list uses the global
        file.
      </p>

      <h2>Command</h2>
      <CodeBlock
        language="text"
        code={`dits config [OPTIONS] [KEY] [VALUE]

Options:
    --global   Use the global file
-l, --list     List public values from the selected file
    --unset    Remove an optional key
-h, --help     Show command help`}
      />
      <CodeBlock
        language="bash"
        code={`# Repository configuration
dits config chunking.target_size 128KB
dits config chunking.target_size
dits config --list

# Global configuration
dits config --global telemetry.enabled false
dits config --global --list

# Optional identity fields can be removed
dits config --global --unset user.email`}
      />
      <p>
        Flags such as <code>--local</code>, <code>--system</code>,{" "}
        <code>--edit</code>, <code>--show-origin</code>, and top-level{" "}
        <code>-c</code> overrides do not exist.
      </p>

      <h2>Accepted keys</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Current effect</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {configKeys.map((item) => (
            <TableRow key={item.key}>
              <TableCell className="font-mono text-sm">{item.key}</TableCell>
              <TableCell className="font-mono text-sm">{item.defaultValue}</TableCell>
              <TableCell>{item.effect}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p>
        Boolean values are <code>true</code> or <code>false</code>. Chunk sizes accept
        raw bytes or <code>B</code>, <code>KB</code>, <code>MB</code>, and{" "}
        <code>GB</code> suffixes. Keep{" "}
        <code>min_size &lt;= target_size &lt;= max_size</code>; the current parser does
        not validate that relationship.
      </p>

      <Callout type="warning" title="Commit identity is environment-based" className="not-prose my-6">
        Setting <code>user.name</code> or <code>user.email</code> does not currently
        change commit authors. Use <code>DITS_AUTHOR_NAME</code> and{" "}
        <code>DITS_AUTHOR_EMAIL</code> until configuration-backed identity is wired up.
      </Callout>

      <h2>TOML format</h2>
      <CodeBlock
        language="toml"
        code={`[user]
name = "Jane Editor"
email = "jane@example.com"

[core]
default_branch = "main"
verbose = false

[chunking]
target_size = 65536
min_size = 16384
max_size = 262144

[telemetry]
enabled = false
last_sent = 0`}
      />
      <p>
        Unknown keys passed to <code>dits config</code> are rejected. Remotes are
        separate repository metadata in <code>.dits/remotes</code> and are managed by{" "}
        <code>dits remote</code>.
      </p>
      <Callout type="warning" title="Malformed files fail closed" className="not-prose my-6">
        A malformed repository TOML file prevents that repository from opening and
        is not rewritten. A malformed global file disables telemetry for unrelated
        commands; telemetry status, enable, and disable fail until you repair the
        TOML explicitly.
      </Callout>

      <h2>More detail</h2>
      <ul>
        <li>
          <Link href="/docs/configuration/repository">Repository configuration</Link>
        </li>
        <li>
          <Link href="/docs/configuration/global">Global configuration</Link>
        </li>
        <li>
          <Link href="/docs/configuration/env">Environment variables</Link>
        </li>
        <li>
          <Link href="/docs/cli-reference">CLI reference</Link>
        </li>
      </ul>
    </div>
  );
}
