import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Callout } from "@/components/ui/callout";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Privacy - Dits Website and Local Playground",
  description:
    "How the Dits website and browser playground handle data, external links, and standard hosting logs.",
  canonical: "https://dits.byronwade.com/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" tabIndex={-1} className="pt-[104px]">
        <article className="container py-16 sm:py-20">
          <div className="prose mx-auto max-w-3xl dark:prose-invert">
            <p className="text-sm text-muted-foreground">Effective July 16, 2026</p>
            <h1>Privacy</h1>
            <p>
              Dits is an open-source local alpha. This website does not require a
              Dits account, and it does not provide a hosted repository service.
            </p>

            <Callout type="note" title="Browser playground" className="not-prose my-8">
              Files and text selected in the playground are processed by WebAssembly
              in your browser. The playground code does not upload that content or
              retain it after the browser session ends.
            </Callout>

            <h2>Website requests</h2>
            <p>
              The infrastructure serving this site may process ordinary request
              information—such as an IP address, browser details, requested URL,
              timestamp, and security events—to deliver and protect the site. Dits
              does not currently run product analytics or advertising trackers on
              these pages.
            </p>

            <h2>Local storage</h2>
            <p>
              The site may store interface preferences in your browser, including
              theme choice and whether you dismissed the alpha warning. Clearing
              site data removes those preferences.
            </p>

            <h2>CLI telemetry</h2>
            <p>
              The separately installed Dits CLI has optional telemetry that is
              disabled by default. It records and attempts to send a limited command
              event only after explicit enablement. The event fields, controls, and
              retained configuration are documented in the{" "}
              <Link href="/docs/architecture/security#cli-telemetry">
                CLI security model
              </Link>.
            </p>

            <h2>External services</h2>
            <p>
              Links to GitHub, npm, and other external services are governed by
              those services&apos; privacy practices. Information included in a public
              issue, discussion, or pull request may be visible to others.
            </p>

            <h2>Questions</h2>
            <p>
              For a privacy question or a correction to this notice, use the
              project&apos;s <Link href="/contact">contact options</Link>.
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
