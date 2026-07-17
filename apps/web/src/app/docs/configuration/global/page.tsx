import { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Global Configuration",
  description: "The global Dits TOML file and its current-alpha runtime effects",
};

export default function GlobalConfigPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Configuration"
        title="Global Configuration"
        description="Global configuration is one platform-specific TOML file selected with --global."
      />

      <h2>Location</h2>
      <p>
        Dits asks the operating system for its user configuration directory and appends{" "}
        <code>dits/config.toml</code>. Typical locations are:
      </p>
      <CodeBlock
        language="text"
        code={`Linux:  $XDG_CONFIG_HOME/dits/config.toml or $HOME/.config/dits/config.toml
macOS:  ~/Library/Application Support/dits/config.toml
Windows: %APPDATA%/dits/config.toml`}
      />
      <p>
        There is no <code>~/.ditsconfig</code> file and no{" "}
        <code>DITS_CONFIG_GLOBAL</code> path override in the current CLI.
      </p>

      <h2>Use the global file</h2>
      <CodeBlock
        language="bash"
        code={`# List the global document
dits config --global --list

# Read or write a global key
dits config --global telemetry.enabled
dits config --global telemetry.enabled false

# Remove an optional stored preference
dits config --global --unset user.email`}
      />
      <p>
        Outside a repository, <code>dits config</code> and{" "}
        <code>dits config --list</code> also select this file. Keyed operations outside
        a repository still require <code>--global</code>.
      </p>

      <Callout type="important" title="Limited inheritance" className="not-prose my-6">
        The current alpha does not merge global settings into a repository-effective
        view. Repository chunking uses <code>.dits/config.toml</code> or built-in
        defaults, not global <code>chunking.*</code> values.
      </Callout>

      <h2>What has a global runtime effect?</h2>
      <p>
        <code>telemetry.enabled</code> is the one public key currently loaded directly
        from the global file. Telemetry is disabled by default; the dedicated commands
        are the clearest way to manage it:
      </p>
      <CodeBlock
        language="bash"
        code={`dits telemetry status
dits telemetry enable
dits telemetry disable`}
      />
      <p>
        Global <code>user.*</code>, <code>core.*</code>, and{" "}
        <code>chunking.*</code> values can be stored, but repository operations do not
        currently inherit them. In particular, commit identity comes from the author
        environment variables documented on the environment page.
      </p>

      <h2>Unsupported global settings</h2>
      <p>
        Aliases, credential helpers, editors, pagers, global ignore files, transfer
        limits, pull/push defaults, colors, and signing keys are design work. The current
        setter rejects those keys.
      </p>

      <h2>Related topics</h2>
      <ul>
        <li>
          <Link href="/docs/configuration">Configuration overview</Link>
        </li>
        <li>
          <Link href="/docs/configuration/repository">Repository configuration</Link>
        </li>
        <li>
          <Link href="/docs/configuration/env">Environment variables</Link>
        </li>
      </ul>
    </div>
  );
}
