import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cpu } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { generateMetadata as genMeta } from "@/lib/seo";
import { PlaygroundClient } from "./playground-client";

export const metadata: Metadata = genMeta({
  title: "Playground - Run the Dits Engine in Your Browser",
  description:
    "Interactive playground for Dits. Drop a file or edit text and watch the real Dits engine chunk, hash, and deduplicate it live in your browser via WebAssembly — nothing uploaded.",
  canonical: "https://dits.dev/playground",
  keywords: [
    "dits playground",
    "content-defined chunking demo",
    "BLAKE3 demo",
    "deduplication demo",
    "webassembly version control",
  ],
  openGraph: {
    type: "website",
    images: [{ url: "/dits.png", width: 1200, height: 630, alt: "Dits Playground" }],
  },
  twitter: { card: "summary_large_image" },
});

/**
 * Playground — runs the real Dits engine (dits-core) compiled to WebAssembly.
 * The interactive surface is a client component; this server component supplies
 * metadata, the global chrome, and the static hero.
 *
 * AGENTS.md: main has skip-link target id; decorative icons aria-hidden.
 */
export default function PlaygroundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1 pt-[104px]" tabIndex={-1}>
        {/* Hero */}
        <section className="container pt-12 pb-8 md:pt-16" aria-labelledby="playground-heading">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="outline" className="mb-4 gap-1.5">
              <Cpu className="size-3.5" aria-hidden="true" />
              Real engine · WebAssembly · runs locally
            </Badge>
            <h1 id="playground-heading" className="text-4xl font-bold tracking-tight md:text-6xl">
              Run the Dits engine{" "}
              <span className="text-brand">in your browser</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Drop a file or edit the text below. The actual Dits chunking and BLAKE3 hashing — the
              same code the CLI runs — executes on your data, in your browser, with nothing
              uploaded. Edit it and watch how few chunks actually change.
            </p>
          </div>
        </section>

        {/* Interactive playground */}
        <section className="container pb-16 md:pb-24" aria-label="Interactive chunking playground">
          <div className="mx-auto max-w-4xl">
            <PlaygroundClient />
          </div>
        </section>

        {/* Footer CTA */}
        <section className="border-t bg-muted/50" aria-labelledby="play-cta-heading">
          <div className="container py-12 md:py-16">
            <div className="mx-auto max-w-3xl text-center">
              <h2 id="play-cta-heading" className="text-2xl md:text-3xl font-bold mb-3">
                Like what you see?
              </h2>
              <p className="text-muted-foreground mb-6">
                Read how it works, or install the CLI and run it on your real projects.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button render={<Link href="/how-it-works" />}>How it works</Button>
                <Button variant="outline" render={<Link href="/download" />}>Install the CLI</Button>
                <Button
                  variant="outline"
                  render={
                    <Link href="https://github.com/byronwade/dits" target="_blank" rel="noopener noreferrer" />
                  }
                >
                  <GithubIcon className="size-4" />
                  GitHub
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
