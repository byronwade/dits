import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Package, Terminal } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { StatusPill } from "@/components/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Install Dits - Local Alpha",
  description:
    "Install the Dits v0.1.5 local alpha from npm or build the open-source Rust CLI directly.",
  canonical: "https://dits.dev/download",
});

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="pt-16">
        <section className="border-b border-border">
          <div className="container py-20 sm:py-28">
            <div className="mx-auto max-w-4xl text-center">
              <StatusPill tone="warning">v0.1.5 alpha</StatusPill>
              <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
                Install the local Dits alpha
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                The v0.1.5 npm package contains binaries for Apple Silicon macOS
                and Windows x64. Other targets currently require a source build.
                No account or remote service is required.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-16 sm:py-20">
          <div className="mx-auto max-w-4xl">
            <Callout type="warning" title="Protect your data">
              Dits is early alpha software. Use it only on disposable or
              independently backed-up projects and compare hashes after restoring
              important files.
            </Callout>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <Card className="border-brand/30">
                <CardHeader>
                  <Package className="mb-2 size-6 text-brand" aria-hidden="true" />
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>Install from npm</CardTitle>
                    <Badge variant="secondary">Two packaged targets</Badge>
                  </div>
                  <CardDescription>
                    Requires Node.js 16 or later. Confirmed package targets:
                    macOS arm64 and Windows x64.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-xl border border-border bg-muted p-4 text-sm"><code>{`npm install -g @byronwade/dits
dits --version`}</code></pre>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Linux, Intel macOS, and Windows arm64 binaries are not present
                    in the published v0.1.5 npm artifact.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Terminal className="mb-2 size-6 text-brand" aria-hidden="true" />
                  <CardTitle>Build the source</CardTitle>
                  <CardDescription>
                    Use the Rust workspace on targets not packaged by npm, or
                    when reviewing the implementation directly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-xl border border-border bg-muted p-4 text-sm"><code>{`git clone https://github.com/byronwade/dits.git
cd dits
cargo build --release -p dits
./target/release/dits --version`}</code></pre>
                </CardContent>
              </Card>
            </div>

            <Callout type="note" title="Other installers" className="mt-6">
              There is no published shell installer, Homebrew tap, or crates.io
              package. Do not use old one-line install commands that reference a
              missing <code>install.sh</code>.
            </Callout>

            <div className="mt-10 text-center">
              <Button render={<Link href="/docs/getting-started" />}>
                Create a safe evaluation repository
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
