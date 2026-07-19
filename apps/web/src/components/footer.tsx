"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LifeBuoy, Bug } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { getProduct } from "@/lib/products";

const communityLinks = [
  {
    title: "GitHub",
    href: "https://github.com/byronwade/dits",
    icon: GithubIcon,
    label: "View Dits on GitHub",
  },
  {
    title: "Support",
    href: "https://github.com/byronwade/dits/blob/main/SUPPORT.md",
    icon: LifeBuoy,
    label: "Read the Dits support guide",
  },
  {
    title: "Report Issues",
    href: "https://github.com/byronwade/dits/issues/new/choose",
    icon: Bug,
    label: "Report an issue on GitHub",
  },
];

const legalLinks = [
  { title: "License (Apache-2.0 / MIT)", href: "/license" }, // AGENTS.md: Non-breaking spaces
  { title: "Privacy Policy", href: "/privacy" },
  { title: "Contact", href: "/contact" },
];

/**
 * Footer component — product-aware: the Documentation and Resources columns
 * follow the active product (media vs. AI), derived from the path so the footer
 * stays prop-less. Community + legal are shared across both surfaces.
 *
 * AGENTS.md guidelines:
 * - MUST: Links are links (using <a>/<Link>)
 * - MUST: Visible focus rings on interactive elements
 * - MUST: Icon-only buttons have descriptive aria-label (icons have text labels here)
 * - MUST: Use non-breaking spaces where appropriate
 * - MUST: Decorative icons are aria-hidden
 */
export function Footer() {
  const pathname = usePathname();
  const product = getProduct(pathname);

  return (
    <footer className="border-t border-border bg-card" role="contentinfo">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link
              href={product.home}
              className="flex items-center space-x-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-fit"
              aria-label={`${product.name} - Go to homepage`}
            >
              <Image
                src="/dits.png"
                alt="Dits Logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <span className="font-bold text-foreground">{product.name}</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              {product.id === "ai"
                ? "A research track exploring how Dits could version models, datasets, and derived research artifacts. Not a separate shipped product."
                : "Open, local-first version control for large media and asset pipelines. Local alpha available; collaboration is on the roadmap."}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4" id="footer-docs">Documentation</h4>
            <ul className="space-y-2 text-sm" aria-labelledby="footer-docs">
              {product.footer.documentation.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 inline-block py-1"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4" id="footer-resources">Resources</h4>
            <ul className="space-y-2 text-sm" aria-labelledby="footer-resources">
              {product.footer.resources.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 inline-block py-1"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4" id="footer-community">Community</h4>
            <ul className="space-y-2 text-sm" aria-labelledby="footer-community">
              {communityLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 py-1"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${link.label} (opens in new tab)`}
                  >
                    {/* AGENTS.md: Decorative icons are aria-hidden, text labels provided */}
                    {link.icon && <link.icon className="h-4 w-4" aria-hidden="true" />}
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground" aria-label="Legal">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 py-1 px-1"
              >
                {link.title}
              </Link>
            ))}
          </nav>
          <p className="text-sm text-muted-foreground">
            {/* AGENTS.md: Use the ellipsis character, non-breaking space for year */}
            &copy;&nbsp;{new Date().getFullYear()} Dits. Open source, local-first,
            and built in public.
          </p>
        </div>
      </div>
    </footer>
  );
}
