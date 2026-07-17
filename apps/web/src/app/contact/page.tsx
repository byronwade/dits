import type { Metadata } from "next";
import Link from "next/link";
import { Bug, MessagesSquare, ShieldAlert } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Contact the Dits Open-Source Project",
  description:
    "Ask a Dits question, report a reproducible bug, or privately disclose a security concern.",
  canonical: "https://dits.dev/contact",
});

const options = [
  {
    icon: Bug,
    title: "Reproducible bugs",
    description:
      "Open an issue with the Dits version, platform, filesystem, exact commands, expected result, and a disposable fixture when possible.",
    label: "Open an issue",
    href: "https://github.com/byronwade/dits/issues/new",
  },
  {
    icon: MessagesSquare,
    title: "Questions and design discussion",
    description:
      "Use GitHub Discussions for evaluation questions, format review, workflow evidence, and contributor coordination.",
    label: "Join the discussion",
    href: "https://github.com/byronwade/dits/discussions",
  },
  {
    icon: ShieldAlert,
    title: "Security reports",
    description:
      "Use GitHub's private vulnerability-reporting flow when disclosure should not begin in a public issue.",
    label: "Report privately",
    href: "https://github.com/byronwade/dits/security/advisories/new",
  },
] as const;

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" tabIndex={-1} className="pt-[104px]">
        <section className="container py-16 text-center sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
              Contact the project
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Dits is maintained in public as an early open-source project. There
              is no hosted service, sales team, guaranteed support channel, or SLA.
            </p>
          </div>
        </section>

        <section className="container pb-20">
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
            {options.map((option) => (
              <Card key={option.title}>
                <CardHeader>
                  <option.icon className="mb-3 size-6 text-brand" aria-hidden="true" />
                  <CardTitle>{option.title}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                  <Button
                    className="mt-4 w-fit"
                    variant="outline"
                    render={
                      <Link
                        href={option.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${option.label} on GitHub (opens in a new tab)`}
                      />
                    }
                  >
                    {option.label}
                  </Button>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
