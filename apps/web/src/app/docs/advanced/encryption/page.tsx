import { Metadata } from "next";
import Link from "next/link";
import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Repository Encryption - Disabled in the Alpha",
  description:
    "Current alpha status and fail-closed behavior for the retired Dits repository-encryption experiment.",
  canonical: "https://dits.byronwade.com/docs/advanced/encryption",
});

export default function EncryptionPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Advanced Topics"
        title="Repository encryption is disabled"
        description="The early encryption experiment did not protect every storage engine or metadata path, so the alpha does not expose it as a security boundary."
      />

      <Callout type="warning" title="Do not rely on repository encryption" className="not-prose my-6">
        Dits does not currently provide complete repository encryption, encrypted
        remote transport, or supported key management. Protect repositories with
        operating-system and storage controls appropriate to your environment.
      </Callout>

      <h2>Command behavior</h2>
      <ul>
        <li>
          <code>encrypt-init</code>, <code>login</code>, and <code>change-password</code>{" "}
          fail with a nonzero exit status and do not change keystores or repository data.
        </li>
        <li>
          <code>encrypt-status</code> reports whether a legacy experimental keystore
          is present. It does not unlock or enable encryption.
        </li>
        <li>
          <code>logout</code> only clears a legacy on-disk key cache. It does not alter
          repository contents.
        </li>
      </ul>
      <CodeBlock
        language="bash"
        code={`dits encrypt-status
dits logout`}
      />

      <h2>Legacy experimental repositories</h2>
      <p>
        When a repository contains the old experimental keystore, current repository
        operations fail closed before loading configuration or storage. This prevents
        the alpha from silently writing plaintext into a repository that may have been
        assumed to be protected.
      </p>
      <Callout type="important" title="Preserve data before recovery" className="not-prose my-6">
        Do not delete or modify a legacy keystore as a workaround. Preserve a backup of
        the entire repository and seek project-specific recovery guidance first.
      </Callout>

      <h2>What is planned</h2>
      <p>
        A future encryption design needs complete storage coverage, an auditable key
        lifecycle, migration and recovery semantics, and independent review before it
        can be presented as a supported security feature. Track this work on the{" "}
        <Link href="/docs/roadmap">roadmap</Link> and review the{" "}
        <Link href="/docs/architecture/security">current security model</Link>.
      </p>
    </div>
  );
}
