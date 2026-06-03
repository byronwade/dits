import type { Metadata } from "next";
import Link from "next/link";
import { Scale, Check, FileText } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GithubIcon } from "@/components/icons/github-icon";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "License — Apache-2.0 OR MIT",
  description:
    "Dits is free and open source, dual-licensed under the Apache License 2.0 or the MIT License. Use it under whichever license suits your project.",
  canonical: "https://dits.dev/license",
});

const REPO = "https://github.com/byronwade/dits/blob/main";

const licenses = [
  {
    name: "Apache License 2.0",
    spdx: "Apache-2.0",
    href: `${REPO}/LICENSE`,
    summary:
      "Permissive, with an explicit grant of patent rights from contributors. A good default for businesses that want patent protection.",
    points: ["Commercial use", "Modification & distribution", "Express patent grant", "Trademark use not granted"],
  },
  {
    name: "MIT License",
    spdx: "MIT",
    href: `${REPO}/LICENSE-MIT`,
    summary:
      "Short and maximally permissive. Choose this when you want the simplest possible terms and broad compatibility.",
    points: ["Commercial use", "Modification & distribution", "Minimal conditions", "Just keep the notice"],
  },
];

export default function LicensePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1 pt-[104px]">
        {/* Hero */}
        <section className="container py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Scale className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">License</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Dits is 100% free and open source, dual-licensed under{" "}
              <span className="font-medium text-foreground">Apache-2.0 OR MIT</span>. You may use,
              modify, and distribute it under whichever of the two licenses works best for your
              project &mdash; you don&apos;t have to comply with both.
            </p>
          </div>
        </section>

        {/* The two licenses */}
        <section className="border-y bg-muted/40">
          <div className="container py-16">
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
              {licenses.map((l) => (
                <Card key={l.spdx} className="flex flex-col p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold">{l.name}</h2>
                  </div>
                  <p className="mb-4 text-muted-foreground">{l.summary}</p>
                  <ul className="mb-6 space-y-2">
                    {l.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 flex-shrink-0 text-brand" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="mt-auto"
                    render={
                      <Link href={l.href} target="_blank" rel="noopener noreferrer" />
                    }
                  >
                    <GithubIcon className="mr-2 h-4 w-4" />
                    Read the full {l.spdx} text
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* What this means */}
        <section className="container py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-4 text-2xl font-bold">What &ldquo;Apache-2.0 OR MIT&rdquo; means</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                This is the same dual-license model used across the Rust ecosystem. The{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">OR</code> is a
                choice you make as the user: pick Apache-2.0 if you want its explicit patent grant,
                or MIT if you want the shortest, simplest terms. Either way, there are no usage
                limits, no file-size caps, and no account required.
              </p>
              <p>
                Both license texts live in the repository as{" "}
                <Link href={`${REPO}/LICENSE`} target="_blank" rel="noopener noreferrer" className="text-brand underline-offset-2 hover:underline">
                  LICENSE
                </Link>{" "}
                (Apache-2.0) and{" "}
                <Link href={`${REPO}/LICENSE-MIT`} target="_blank" rel="noopener noreferrer" className="text-brand underline-offset-2 hover:underline">
                  LICENSE-MIT
                </Link>
                . The canonical declaration is the{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">license = &quot;Apache-2.0 OR MIT&quot;</code>{" "}
                field in the workspace manifest.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button render={<Link href="https://github.com/byronwade/dits" target="_blank" rel="noopener noreferrer" />}>
                <GithubIcon className="mr-2 h-4 w-4" />
                View the repository
              </Button>
              <Button variant="outline" render={<Link href="/docs" />}>
                Read the docs
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
