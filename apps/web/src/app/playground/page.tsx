import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Scissors, Fingerprint, Copy, FileUp, Pencil, Cpu } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Playground - Run the Dits Engine in Your Browser",
  description:
    "An interactive playground for Dits. Drop a file and watch the real Dits engine chunk, hash, and deduplicate it live in your browser via WebAssembly. Coming soon.",
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
    images: [
      {
        url: "/dits.png",
        width: 1200,
        height: 630,
        alt: "Dits Playground",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
});

/**
 * Playground (Phase 1 stub).
 *
 * The live experience compiles the real Dits Rust core to WebAssembly so the
 * exact chunking + hashing that the CLI runs executes on your file, in your
 * browser, with nothing uploaded. That engine work is Phase 2; this page sets
 * expectations and links out in the meantime.
 *
 * AGENTS.md: main has skip-link target id; decorative icons aria-hidden;
 * status conveyed with text + icon, not color alone.
 */

const previewSteps = [
  {
    icon: FileUp,
    title: "Drop a file",
    body: "Pick any file — a video, a project file, an image. It never leaves your machine; everything runs locally in the browser.",
  },
  {
    icon: Scissors,
    title: "Watch it chunk",
    body: "The real FastCDC algorithm splits it at content-defined boundaries. See every chunk and its size as they form.",
  },
  {
    icon: Fingerprint,
    title: "See the hashes",
    body: "Each chunk gets a BLAKE3 content address. Identical chunks share a hash — that is how deduplication happens.",
  },
  {
    icon: Pencil,
    title: "Edit, then re-add",
    body: "Change one frame or one byte and re-run. Watch how few chunks actually change while the rest are reused.",
  },
];

export default function PlaygroundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1 pt-[104px]" tabIndex={-1}>
        {/* Hero */}
        <section className="container py-16 md:py-24" aria-labelledby="playground-heading">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="outline" className="mb-4 gap-1.5">
              <Cpu className="size-3.5" aria-hidden="true" />
              Coming soon
            </Badge>
            <h1 id="playground-heading" className="text-4xl font-bold tracking-tight md:text-6xl">
              Run the Dits engine{" "}
              <span className="text-brand">in your browser</span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-3xl mx-auto">
              We&apos;re compiling the real Dits core to WebAssembly so the exact chunking and
              hashing the CLI runs executes on your file, live, with nothing uploaded. Drop a
              file, watch it chunk and deduplicate, edit it, and see how little actually changes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button size="lg" render={<Link href="/how-it-works" />}>See how it works</Button>
              <Button
                size="lg"
                variant="outline"
                render={
                  <Link
                    href="https://github.com/byronwade/dits"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <GithubIcon className="size-4" />
                Follow on GitHub
              </Button>
            </div>
          </div>
        </section>

        {/* What it will do */}
        <section className="border-y bg-muted/50" aria-labelledby="preview-heading">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-5xl">
              <h2 id="preview-heading" className="text-3xl font-bold tracking-tight text-center mb-4">
                What you&apos;ll be able to do
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                No sign-up, no upload, no install. Just the real engine running on your data.
              </p>
              <div className="grid gap-6 md:grid-cols-2" role="list">
                {previewSteps.map((step, i) => (
                  <Card key={step.title} role="listitem" className="h-full">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10">
                          <step.icon className="size-5 text-brand" aria-hidden="true" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground" aria-hidden="true">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <CardTitle className="text-lg">{step.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{step.body}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Honesty note */}
        <section className="container py-16 md:py-24" aria-labelledby="status-heading">
          <div className="mx-auto max-w-3xl">
            <Card className="border-brand/30">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Copy className="size-5 text-brand" aria-hidden="true" />
                  <CardTitle>Why it&apos;s not live yet</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  The Dits core is written in Rust. The chunking and hashing are pure, portable
                  computation, so we can compile them to WebAssembly and run the genuine engine in
                  the browser — not a re-implementation or a canned animation. Wiring that
                  toolchain up correctly takes a little time, and we&apos;d rather ship the real
                  thing than a fake.
                </p>
                <p>
                  Want to try it today instead?{" "}
                  <Link href="/download" className="text-brand underline-offset-4 hover:underline">
                    Install the CLI
                  </Link>{" "}
                  and run{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
                    dits add
                  </code>{" "}
                  on your own files.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
