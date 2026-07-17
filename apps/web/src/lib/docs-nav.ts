/**
 * Docs navigation data — single source of truth for BOTH product docs trees.
 * Lives in a plain (non-client) module so it can be imported by server code
 * (e.g. the product/route logic in lib/products.ts) as well as the client
 * sidebar/pager. The media nav was moved here verbatim from docs-sidebar.tsx.
 */

export interface DocLink {
  title: string;
  href: string;
}

export interface DocSection {
  title: string;
  href?: string;
  items: DocLink[];
}

export const docsNavigation: DocSection[] = [
  {
    title: "Getting Started",
    href: "/docs",
    items: [
      { title: "Overview", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Quick Start", href: "/docs/getting-started" },
      { title: "Why Evaluate Dits", href: "/docs/why-dits" },
      { title: "Status & Roadmap", href: "/docs/roadmap" },
    ],
  },
  {
    title: "Core Concepts",
    href: "/docs/concepts",
    items: [
      { title: "Core Concepts", href: "/docs/concepts" },
      { title: "Chunking & Deduplication", href: "/docs/concepts/chunking" },
      { title: "Content Addressing", href: "/docs/concepts/content-addressing" },
      { title: "Repositories", href: "/docs/concepts/repositories" },
      { title: "Commits & History", href: "/docs/concepts/commits" },
      { title: "Branching & Merging", href: "/docs/concepts/branching" },
      { title: "Peer-to-Peer (Roadmap)", href: "/docs/concepts/peer-to-peer" },
    ],
  },
  {
    title: "CLI Reference",
    href: "/docs/cli-reference",
    items: [
      { title: "CLI Reference", href: "/docs/cli-reference" },
      { title: "Repository Commands", href: "/docs/cli/repository" },
      { title: "File Commands", href: "/docs/cli/files" },
      { title: "Diff Commands", href: "/docs/cli/diff" },
      { title: "History Commands", href: "/docs/cli/history" },
      { title: "Branch Commands", href: "/docs/cli/branches" },
      { title: "Stash Commands", href: "/docs/cli/stash" },
      { title: "Remote Commands (Roadmap)", href: "/docs/cli/remotes" },
      { title: "Lock Commands", href: "/docs/cli/locks" },
      { title: "VFS Commands", href: "/docs/cli/vfs" },
      { title: "Video Commands", href: "/docs/cli/video" },
      { title: "Proxy Commands", href: "/docs/cli/proxies" },
      { title: "Metadata Commands", href: "/docs/cli/metadata" },
      { title: "Dependency Commands", href: "/docs/cli/dependencies" },
      { title: "Storage Commands", href: "/docs/cli/storage" },
      { title: "Encryption Commands", href: "/docs/cli/encryption" },
      { title: "Audit Commands", href: "/docs/cli/audit" },
      { title: "Maintenance Commands", href: "/docs/cli/maintenance" },
      { title: "P2P Commands (Roadmap)", href: "/docs/cli/p2p" },
      { title: "Advanced CLI", href: "/docs/cli/advanced" },
    ],
  },
  {
    title: "Configuration",
    href: "/docs/configuration",
    items: [
      { title: "Configuration", href: "/docs/configuration" },
      { title: "Repository Config", href: "/docs/configuration/repository" },
      { title: "Global Config", href: "/docs/configuration/global" },
      { title: "Environment Variables", href: "/docs/configuration/env" },
    ],
  },
  {
    title: "Experimental Topics",
    href: "/docs/roadmap",
    items: [
      { title: "Encryption", href: "/docs/advanced/encryption" },
      { title: "Storage Tiers", href: "/docs/advanced/storage-tiers" },
      { title: "Status & Roadmap", href: "/docs/roadmap" },
      { title: "Measured Benchmarks", href: "/benchmarks" },
    ],
  },
  {
    title: "Guides",
    href: "/docs/guides/ditsignore",
    items: [
      { title: "Ditsignore", href: "/docs/guides/ditsignore" },
      { title: "Hooks", href: "/docs/guides/hooks" },
      { title: "Glossary", href: "/docs/guides/glossary" },
    ],
  },
  {
    title: "API & Integration (Design)",
    href: "/docs/api/rest",
    items: [
      { title: "REST API (Design)", href: "/docs/api/rest" },
      { title: "Webhooks (Design)", href: "/docs/api/webhooks" },
      { title: "Wire Protocol (Design)", href: "/docs/api/wire" },
      { title: "SDKs (Design)", href: "/docs/api/sdks" },
      { title: "CI/CD Integration (Design)", href: "/docs/api/cicd" },
    ],
  },
  {
    title: "Deployment (Historical Design)",
    href: "/docs/deployment",
    items: [
      { title: "Deployment Overview", href: "/docs/deployment" },
      { title: "Docker (Design)", href: "/docs/deployment/docker" },
      { title: "Kubernetes (Design)", href: "/docs/deployment/kubernetes" },
      { title: "Self-Hosting (Design)", href: "/docs/deployment/self-hosting" },
      { title: "Cloud Providers (Design)", href: "/docs/deployment/cloud" },
    ],
  },
  {
    title: "Architecture",
    href: "/docs/architecture",
    items: [
      { title: "Architecture Overview", href: "/docs/architecture" },
      { title: "Testing Framework", href: "/docs/testing" },
      { title: "Benchmarks", href: "/benchmarks" },
      { title: "Security", href: "/docs/architecture/security" },
      { title: "Status & Roadmap", href: "/docs/roadmap" },
    ],
  },
  {
    title: "Community",
    href: "/docs/contributing",
    items: [
      { title: "Contributing", href: "/docs/contributing" },
      { title: "Development Setup", href: "/docs/development" },
      { title: "Code of Conduct", href: "/docs/code-of-conduct" },
      { title: "Roadmap", href: "/docs/roadmap" },
      { title: "Troubleshooting", href: "/docs/troubleshooting" },
    ],
  },
];

/**
 * AI docs navigation — the "Dits for AI" surface. Slugs deliberately match the
 * media docs where the topic is identical (content-addressing, chunking,
 * getting-started, why-dits, installation, roadmap) so the product launcher can
 * map a docs page to its exact counterpart. AI-only pages (tensor-chunking,
 * similarity, derivation, workflows) have no media mirror and fall back to the
 * nearest shared ancestor on toggle.
 */
export const aiDocsNavigation: DocSection[] = [
  {
    title: "Research Track",
    href: "/ai/docs",
    items: [
      { title: "Overview", href: "/ai/docs" },
      { title: "Research Model", href: "/ai/how-it-works" },
      { title: "Evidence Gaps", href: "/ai/benchmarks" },
      { title: "Research FAQ", href: "/ai/faq" },
    ],
  },
  {
    title: "Shared Product",
    href: "/docs",
    items: [
      { title: "Core Engine Docs", href: "/docs" },
      { title: "Status & Roadmap", href: "/docs/roadmap" },
      { title: "Benchmarks", href: "/benchmarks" },
    ],
  },
];

/** Pick the docs navigation tree for the active surface. */
export function getDocsNav(pathname: string | null): DocSection[] {
  if (pathname === "/ai/docs" || (pathname?.startsWith("/ai/docs") ?? false)) {
    return aiDocsNavigation;
  }
  return docsNavigation;
}

/**
 * Flatten a docs navigation tree into a single ordered list of pages,
 * de-duplicating repeated hrefs (a section landing page can appear both as the
 * section `href` and as the first item).
 */
export function flattenDocsNav(nav: DocSection[]): DocLink[] {
  const flat: DocLink[] = [];
  const seen = new Set<string>();
  for (const section of nav) {
    for (const item of section.items) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      flat.push(item);
    }
  }
  return flat;
}
