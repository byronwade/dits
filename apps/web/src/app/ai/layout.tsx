import type { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits for AI — Version Control for Models, Datasets & Research Data",
  description:
    "Dits for AI brings content-addressed, deduplicating version control to the heaviest data in AI and science: model checkpoints, weights, training datasets, and research data. Store only what changed, sync deltas not whole files, and reproduce artifacts from recipes.",
  canonical: "https://dits.dev/ai",
  keywords: [
    "model weight versioning",
    "checkpoint deduplication",
    "dataset version control",
    "research data versioning",
    "content-addressed storage",
    "AI infrastructure",
    "dits for ai",
  ],
  openGraph: {
    type: "website",
    images: [{ url: "/dits.png", width: 1200, height: 630, alt: "Dits for AI" }],
  },
  twitter: { card: "summary_large_image" },
});

/**
 * AI section layout — wraps the entire `/ai` surface in `.theme-ai`, which
 * retints the shared `--brand` token (and ring/success/glows/gradients) to the
 * indigo AI accent. Every shared component (header dock, cards, CTAs) picks up
 * the accent automatically without per-component branching.
 */
export default function AiLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="theme-ai">{children}</div>;
}
