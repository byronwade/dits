import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { generateMetadata as genMeta } from "@/lib/seo";
import { CORE_FAQS } from "@/lib/product-story";

export const metadata: Metadata = genMeta({
  title: "Dits FAQ - Current Capabilities and Roadmap",
  description:
    "Straight answers about the Dits local alpha, its audience, comparison with Git LFS and Xet, production readiness, and collaboration roadmap.",
  canonical: "https://dits.dev/faq",
});

const additionalFaqs = [
  {
    question: "Does Dits replace Git?",
    answer:
      "Not necessarily. Dits uses Git-shaped concepts and has hybrid text/binary paths, but Git remains the mature choice for ordinary source code. Early Dits pilots should define a narrow large-asset job rather than assume an immediate repository-wide migration.",
  },
  {
    question: "Does Dits support every media format?",
    answer:
      "Dits can store arbitrary bytes, but format-aware behavior is narrower. MP4/ISOBMFF code and experimental media paths exist; a broad, published real-media compatibility matrix is still a roadmap gate.",
  },
  {
    question: "What does frame-addressable versioning mean?",
    answer:
      "FACR experiments with manifests that reference independently addressable frames and explicit edits. This can make some trims, reorders, or Dits-owned edits more explainable. It cannot magically recover intent from every opaque re-encode, and it is not a stable production format.",
  },
  {
    question: "Are the benchmark numbers end-to-end?",
    answer:
      "No. The currently published results measure BLAKE3, FastCDC, SHA-256, and small npm helper components on one disclosed machine. Repository, media-workflow, storage-growth, and network claims require a future public suite.",
  },
  {
    question: "Why wait to build remote sync?",
    answer:
      "A remote multiplies format and data-safety mistakes. Dits first needs deterministic objects, crash-safe writes, recovery behavior, and conformance fixtures; then the protocol can add verified transfer, resumability, atomic refs, identity, authorization, and lock leases.",
  },
  {
    question: "How can I help?",
    answer:
      "Try the CLI on disposable or backed-up data, contribute redistributable media fixtures, report exact reproduction steps, review format and protocol documents, and help build correctness or failure-injection tests.",
  },
] as const;

export default function FAQPage() {
  const faqs = [...CORE_FAQS, ...additionalFaqs];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="pt-16">
        <section className="border-b border-border">
          <div className="container py-20 sm:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary">Frequently asked questions</Badge>
              <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
                Straight answers for an early product
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                What works, what is experimental, and what remains a design.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <Accordion>
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.question} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-base leading-7 text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="container py-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Still evaluating the fit?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Read the status matrix before trying Dits on a disposable or
              independently backed-up project.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button render={<Link href="/docs/roadmap" />}>
                Current status and roadmap
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button variant="outline" render={<Link href="/docs/getting-started" />}>
                Getting started
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
