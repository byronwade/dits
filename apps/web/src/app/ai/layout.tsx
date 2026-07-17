import type { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits for AI Research — Models, Datasets & Derivation",
  description:
    "A Dits research track exploring exact history and reproducible derivation for model, dataset, and scientific artifacts. Not a separate shipped product.",
  keywords: [
    "model weight versioning",
    "checkpoint deduplication",
    "dataset version control",
    "research data versioning",
    "content-addressed storage",
    "AI infrastructure research",
    "dits for ai",
  ],
  openGraph: {
    type: "website",
    images: [{ url: "/dits.png", width: 1200, height: 630, alt: "Dits for AI research" }],
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
