import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { CodeBlock } from "@/components/ui/code-block";
import { Callout } from "@/components/ui/callout";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Troubleshooting the Dits Alpha",
  description:
    "Current troubleshooting guidance for package targets, local repositories, integrity checks, disabled remotes, report-only GC, and experimental paths.",
  canonical: "https://dits.dev/docs/troubleshooting",
});

export default function TroubleshootingPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Support"
        title="Troubleshooting the Alpha"
        description="Start with the current product boundary: local history works, while remote transfer, destructive GC, and supported repository encryption do not."
      />

      <Callout type="warning" title="Protect the evidence" className="not-prose my-6">
        Work on a disposable fixture or a copy with an independently verified
        backup. Do not manually edit <code>.dits</code> while diagnosing a
        problem, and preserve the original error text for a bug report.
      </Callout>

      <h2>Quick triage</h2>

      <CodeBlock
        language="bash"
        code={`dits --version
dits status
dits fsck
dits config --list`}
      />

      <p>
        Run only the commands relevant to the affected repository. Record the
        exact version, OS, architecture, filesystem, command, exit status, and
        smallest redistributable fixture that reproduces the issue.
      </p>

      <h2>Installation and command discovery</h2>

      <h3><code>dits</code> is not found</h3>

      <p>
        Confirm the npm global prefix and whether the executable is on your
        shell&apos;s path:
      </p>

      <CodeBlock
        language="bash"
        code={`npm config get prefix
command -v dits
dits --version`}
      />

      <p>
        The published v0.1.5 package contains only Apple-silicon macOS and
        Windows x64 binaries. Linux, Intel macOS, and Windows ARM64 require a
        source build. On an unsupported target, the package launcher reports that
        no matching binary is present; reinstalling the same artifact does not
        add one. See <Link href="/docs/installation">installation status</Link>.
      </p>

      <h3>A source build fails</h3>

      <p>
        Capture the full Rust diagnostic and toolchain version. Build the active
        package from the repository root:
      </p>

      <CodeBlock
        language="bash"
        code={`rustc -Vv
cargo build --release -p dits`}
      />

      <p>
        Optional all-feature builds can require platform FUSE libraries. A
        failure caused by a missing optional dependency is not evidence that a
        prebuilt binary exists for that platform.
      </p>

      <h2>Local repository errors</h2>

      <h3>&ldquo;Not a Dits repository&rdquo;</h3>

      <p>
        Change to the intended project directory or initialize a new disposable
        evaluation repository. Do not initialize over unrelated data merely to
        silence the error.
      </p>

      <CodeBlock
        language="bash"
        code={`cd /path/to/evaluation-project
dits status

# Only for a directory you intentionally want to initialize
dits init`}
      />

      <h3>A file is absent from the next commit</h3>

      <p>
        The current <code>add</code> command requires one or more paths and has no
        <code> --all</code> flag. Stage the path, inspect status, then commit.
      </p>

      <CodeBlock
        language="bash"
        code={`dits add path/to/file
dits status
dits commit --message "Add file"`}
      />

      <h3>A restore or merge conflict is incomplete</h3>

      <p>
        Preserve the worktree and <code>dits status</code> output before trying
        another operation. Restore does not yet cover complete merge-conflict
        resolution. Use an independently verified backup to recover important
        bytes instead of guessing at internal state.
      </p>

      <h2>Remote commands fail</h2>

      <Callout type="note" title="Expected fail-closed behavior" className="not-prose my-6">
        <code>push</code>, <code>pull</code>, <code>fetch</code>, and
        <code> sync</code> return nonzero for local-path and Internet remotes
        without changing objects, refs, or the working tree. Network clone is
        also unavailable. A configured URL is not a backup destination.
      </Callout>

      <p>
        Use <Link href="/docs/cli/repository">local-filesystem clone</Link> for a
        current repository-copy workflow, then place verified copies in separate
        failure domains with your normal backup tooling.
      </p>

      <h2>Integrity and storage</h2>

      <h3><code>fsck</code> reports an error</h3>

      <CodeBlock
        language="bash"
        code={`dits fsck
dits fsck --verbose`}
      />

      <p>
        Treat a digest mismatch or missing object as possible corruption.
        <code> fsck</code> detects problems but has no repair or remote-fetch
        mode. Preserve the repository, recover from a known-good backup, and
        compare restored files with an independent standard hash.
      </p>

      <h3>The disk is full</h3>

      <CodeBlock
        language="bash"
        code={`dits repo-stats
dits gc --dry-run`}
      />

      <p>
        The GC dry-run only reports candidates and does not reclaim space. Free
        space outside the repository or move a complete, backed-up repository to
        a larger volume. Never delete object files by hand.
      </p>

      <h2>High memory or slow ingest</h2>

      <p>
        Current large-file ingest is not bounded by the target streaming-memory
        formula and can hold file-sized and copied buffers. There is no supported
        memory-limit, disk-buffer, or debug-profile configuration key. Reproduce
        with a smaller backed-up fixture, monitor the process with OS tools, and
        report the file size, format, hardware, filesystem, and elapsed time.
      </p>

      <p>
        Do not compare an observation with a generic throughput promise. Use the
        <Link href="/docs/benchmarks"> benchmark methodology</Link> for measured
        results tied to an environment and commit.
      </p>

      <h2>Experimental FUSE mount</h2>

      <p>
        <code>mount</code> and <code>unmount</code> appear only in a source build
        compiled with the optional <code>fuser</code> feature and require an OS
        FUSE installation. The path is local-only and has no <code>--test</code>
        option. If the commands are absent from help, the binary was built without
        that feature.
      </p>

      <CodeBlock
        language="bash"
        code={`cargo build --release -p dits --features fuser
./target/release/dits mount --help`}
      />

      <h2>Legacy encryption state</h2>

      <p>
        A repository containing the old experimental keystore fails closed before
        normal operations. Inspect the diagnostic state; do not treat that
        keystore as complete repository encryption.
      </p>

      <CodeBlock
        language="bash"
        code={`dits encrypt-status

# Clears a legacy cached key; it does not enable encryption
dits logout`}
      />

      <p>
        <code>encrypt-init</code>, <code>login</code>, and
        <code> change-password</code> intentionally fail without modifying a
        keystore. See <Link href="/docs/cli/encryption">encryption status</Link>.
      </p>

      <h2>Conflicting lock record</h2>

      <p>
        Locks are local advisory metadata, not server-enforced team leases.
        Inspect the record before releasing it; <code>--force</code> only
        overrides the owner check in this local store.
      </p>

      <CodeBlock
        language="bash"
        code={`dits locks --verbose
dits unlock path/to/file

# Use only after confirming the local record is stale
dits unlock path/to/file --force`}
      />

      <h2>Report a reproducible problem</h2>

      <p>
        Search <Link href="https://github.com/byronwade/dits/issues">GitHub issues</Link>
        and <Link href="https://github.com/byronwade/dits/discussions">discussions</Link>.
        A new report should include the exact command and error, Dits version,
        platform details, expected behavior, and a minimal fixture you have
        permission to share. Remove secrets, personal data, proprietary media,
        and private repository paths first.
      </p>
    </div>
  );
}
