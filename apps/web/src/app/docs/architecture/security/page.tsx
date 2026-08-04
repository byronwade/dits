import type { Metadata } from "next";
import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits Security Model - Local Alpha",
  description:
    "The current Dits trust boundary, integrity checks, disabled encryption and transfer paths, telemetry behavior, and safe evaluation guidance.",
  canonical: "https://dits.byronwade.com/docs/architecture/security",
});

export default function SecurityPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Architecture"
        title="Security model"
        description="Dits is a local alpha, not a hosted security platform. This page separates implemented integrity checks from confidentiality, authentication, and network features that do not exist."
      />

      <Callout type="warning" title="Alpha boundary" className="not-prose my-6">
        Use Dits only with disposable or independently backed-up data. There is no
        supported repository encryption, remote authentication, authorization
        system, managed backup, compliance certification, security SLA, or 24/7
        incident-response service.
      </Callout>

      <h2>Current trust boundary</h2>
      <ul>
        <li>
          Repository files and objects live under the permissions and protections
          of the local operating system and filesystem.
        </li>
        <li>
          Objects are content-addressed and checked against their hashes when read;
          <code> dits fsck</code> re-hashes repository objects and checks manifests,
          commits, refs, and graph structure.
        </li>
        <li>
          Hash checks can detect many forms of corruption. They do not encrypt data,
          establish the author&apos;s identity, or stop an attacker who can replace both
          content and references.
        </li>
        <li>
          Commits and repository metadata are not cryptographically signed by a
          supported identity system.
        </li>
      </ul>

      <CodeBlock
        language="bash"
        code={`# Check internal repository consistency
dits fsck

# Record independent hashes for important restored files
shasum -a 256 path/to/file             # macOS
sha256sum path/to/file                 # Linux
Get-FileHash path/to/file -Algorithm SHA256  # PowerShell`}
      />

      <h2>Confidentiality and keys</h2>
      <p>
        The repository-encryption experiment is disabled because it did not cover
        every storage engine or metadata path. <code>encrypt-init</code>,{" "}
        <code>login</code>, and <code>change-password</code> fail nonzero without
        changing repository or keystore data. Repositories containing the legacy
        experimental keystore fail closed.
      </p>
      <p>
        Use filesystem permissions, full-disk or volume encryption, encrypted
        backups, and physical access controls appropriate to your environment. See
        the <Link href="/docs/advanced/encryption">encryption status page</Link> for
        recovery cautions.
      </p>

      <h2>Network surfaces</h2>
      <p>
        <code>push</code>, <code>pull</code>, <code>fetch</code>, and <code>sync</code>{" "}
        are disabled and return nonzero without transferring data or changing a
        repository. Local-path clone works; network clone does not.
      </p>
      <Callout type="important" title="Do not expose dits serve" className="not-prose my-6">
        The experimental <code>dits serve</code> utility is unauthenticated and has no
        TLS. It binds to loopback by default; non-loopback <code>--bind</code> still
        has no auth. Treat it as a developer fixture for an isolated, trusted network
        only. Do not expose it to the internet or an untrusted LAN.
      </Callout>

      <h2>CLI telemetry</h2>
      <p>
        CLI telemetry is disabled by default. When explicitly enabled, the current
        client records a limited command event: command name, argument count, flag
        count, whether any argument looks like a path, CLI version, platform, a
        random installation identifier, a random process identifier, and a
        timestamp. The event constructor does not include argument values, file
        paths, repository names, usernames, machine IDs, or file contents.
      </p>
      <p>
        Enabled telemetry attempts an HTTPS POST to the endpoint compiled into the
        CLI. Disabling telemetry stops future event recording and delivery attempts;
        it does not by itself remove the persisted random identifier or last-send
        timestamp from global configuration.
      </p>
      <CodeBlock
        language="bash"
        code={`dits telemetry status
dits telemetry enable
dits telemetry disable`}
      />
      <p>
        Website behavior is documented separately in the{" "}
        <Link href="/privacy">website privacy notice</Link>.
      </p>

      <h2>Safe evaluation practices</h2>
      <ol>
        <li>Keep an independent source copy and test restores before relying on them.</li>
        <li>Run with the least filesystem privileges practical.</li>
        <li>Do not place secrets in a repository assumed to be encrypted by Dits.</li>
        <li>Do not treat a configured remote as a backup; transfer is disabled.</li>
        <li>Record the exact Dits version when preserving or exchanging a repository.</li>
        <li>Re-run integrity checks after interruption, migration, or suspected damage.</li>
      </ol>

      <h2>Reporting security issues</h2>
      <p>
        Use the details-free{" "}
        <Link href="https://github.com/byronwade/dits/issues/new?template=security-contact.yml">
          security contact form
        </Link>{" "}
        to ask a maintainer to arrange private follow-up. The request is public,
        so include no vulnerability details, proof of concept, secrets, affected
        data, paths, or logs. The project does not promise a bounty, response
        deadline, embargo window, or remediation SLA. General bugs can be filed in the{" "}
        <Link href="https://github.com/byronwade/dits/issues">public issue tracker</Link>.
      </p>
    </div>
  );
}
