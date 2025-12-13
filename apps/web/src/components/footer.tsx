import Link from "next/link";
import { Github, MessageCircle, Bug } from "lucide-react";

const footerLinks = {
  documentation: [
    { title: "Getting Started", href: "/docs/getting-started" },
    { title: "CLI Reference", href: "/docs/cli-reference" },
    { title: "Core Concepts", href: "/docs/concepts" },
    { title: "Configuration", href: "/docs/configuration" },
  ],
  resources: [
    { title: "Download", href: "/download" },
    { title: "About", href: "/about" },
    { title: "Community", href: "/community" },
    { title: "Blog", href: "/blog" },
  ],
  community: [
    {
      title: "GitHub",
      href: "https://github.com/byronwade/dits",
      icon: Github,
      label: "View Dits on GitHub",
    },
    {
      title: "Discussions",
      href: "https://github.com/byronwade/dits/discussions",
      icon: MessageCircle,
      label: "Join GitHub Discussions",
    },
    {
      title: "Report Issues",
      href: "https://github.com/byronwade/dits/issues",
      icon: Bug,
      label: "Report an issue on GitHub",
    },
  ],
  legal: [
    { title: "License (Apache-2.0\u00a0/\u00a0MIT)", href: "/license" }, // AGENTS.md: Non-breaking spaces
    { title: "Privacy Policy", href: "/privacy" },
  ],
};

/**
 * Footer component following AGENTS.md guidelines:
 * - MUST: Links are links (using <a>/<Link>)
 * - MUST: Visible focus rings on interactive elements
 * - MUST: Icon-only buttons have descriptive aria-label (icons have text labels here)
 * - MUST: Use non-breaking spaces where appropriate
 * - MUST: Decorative icons are aria-hidden
 */
export function Footer() {
  return (
    <footer className="border-t bg-muted/50" role="contentinfo">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center space-x-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-fit"
              aria-label="Dits - Go to homepage"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="font-bold text-primary-foreground">D</span>
              </div>
              <span className="font-bold">Dits</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Free and open source version control for video and large files.
              Like Git, but for media.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4" id="footer-docs">Documentation</h4>
            <ul className="space-y-2 text-sm" aria-labelledby="footer-docs">
              {footerLinks.documentation.map((link) => (
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
            <h4 className="font-semibold mb-4" id="footer-resources">Resources</h4>
            <ul className="space-y-2 text-sm" aria-labelledby="footer-resources">
              {footerLinks.resources.map((link) => (
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
            <h4 className="font-semibold mb-4" id="footer-community">Community</h4>
            <ul className="space-y-2 text-sm" aria-labelledby="footer-community">
              {footerLinks.community.map((link) => (
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
        <div className="mt-8 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground" aria-label="Legal">
            {footerLinks.legal.map((link) => (
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
            &copy;&nbsp;{new Date().getFullYear()} Dits. Built for the media
            community.
          </p>
        </div>
      </div>
    </footer>
  );
}
