import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { StatusPill } from "@/components/status-pill";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Dits for AI Research FAQ",
  description:
    "Current boundaries and open questions for applying Dits to model, checkpoint, dataset, and research artifacts.",
};

const faqs = [
  {
    question: "Is Dits for AI a product I can deploy?",
    answer:
      "No. It is a research lens on the same Dits local engine. There are no AI-specific commands, supported tensor formats, model registry, experiment tracker, remote service, or production support.",
  },
  {
    question: "Can the local engine store a model or dataset file?",
    answer:
      "It can store arbitrary bytes in the generic local history, subject to the same alpha warnings as media assets. That does not make the engine tensor-aware or integrated with an ML workflow.",
  },
  {
    question: "Does content-defined chunking deduplicate checkpoints well?",
    answer:
      "Sometimes, but diffuse numeric updates can change bytes throughout a checkpoint and produce little exact reuse. Dits has not published a representative checkpoint corpus or supported savings claim.",
  },
  {
    question: "How does this compare with Hugging Face Xet or DVC?",
    answer:
      "Xet already provides open Git-compatible content-defined chunking, CAS, and deduplication; DVC provides mature data and pipeline versioning patterns. Dits must prove that its future cross-domain derivation graph adds useful value rather than restating those capabilities.",
  },
  {
    question: "What is similarity-addressing?",
    answer:
      "It is a research idea for using approximate fingerprints to locate related content. Similarity cannot serve as exact object identity and must never make an approximate artifact look byte-identical.",
  },
  {
    question: "What is derivation-addressing?",
    answer:
      "It means recording the inputs, code, configuration, tools, and other conditions that produce an artifact. A result should be called reproducible only after rebuilding it and verifying the declared fidelity criteria.",
  },
  {
    question: "Can Dits sync artifacts between training nodes?",
    answer:
      "No. Network push, pull, fetch, sync, network clone, and P2P transfer are not implemented in the current product.",
  },
  {
    question: "What evidence would move this forward?",
    answer:
      "Redistributable model and dataset histories, exact workload generators, failure cases, storage and decode measurements, reproducibility requirements, and fair comparisons with Xet, DVC, Git LFS, registries, and object storage.",
  },
] as const;

export default function AiFaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="pt-16">
        <section className="border-b border-border">
          <div className="container py-20 text-center sm:py-28">
            <StatusPill tone="warning">Research track</StatusPill>
            <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
              Dits for AI research FAQ
            </h1>
          </div>
        </section>
        <section className="container py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <Accordion>
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.question} value={`ai-faq-${index}`}>
                  <AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-base leading-7 text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
