"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface DocLink {
  title: string;
  href: string;
}

interface DocSection {
  title: string;
  href?: string;
  items: DocLink[];
}

const docsNavigation: DocSection[] = [
  {
    title: "Getting Started",
    href: "/docs",
    items: [
      { title: "Overview", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Quick Start", href: "/docs/getting-started" },
      { title: "Why Dits vs Git", href: "/docs/why-dits" },
      { title: "Examples & Use Cases", href: "/docs/examples" },
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
      { title: "Peer-to-Peer", href: "/docs/concepts/peer-to-peer" },
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
      { title: "Tag Commands", href: "/docs/cli/tags" },
      { title: "Stash Commands", href: "/docs/cli/stash" },
      { title: "Remote Commands", href: "/docs/cli/remotes" },
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
      { title: "P2P Commands", href: "/docs/cli/p2p" },
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
    title: "Advanced Topics",
    href: "/docs/advanced/video",
    items: [
      { title: "Video Features", href: "/docs/advanced/video" },
      { title: "Proxy Files", href: "/docs/advanced/proxies" },
      { title: "Encryption", href: "/docs/advanced/encryption" },
      { title: "Storage Tiers", href: "/docs/advanced/storage-tiers" },
      { title: "Virtual Filesystem", href: "/docs/advanced/vfs" },
      { title: "Performance Tuning", href: "/docs/advanced/performance" },
      { title: "Submodules & Monorepos", href: "/docs/advanced/submodules" },
    ],
  },
  {
    title: "Guides",
    href: "/docs/guides/ditsignore",
    items: [
      { title: "Ditsignore", href: "/docs/guides/ditsignore" },
      { title: "Hooks", href: "/docs/guides/hooks" },
      { title: "Workflows", href: "/docs/guides/workflows" },
      { title: "Large Files", href: "/docs/guides/large-files" },
      { title: "Collaboration", href: "/docs/guides/collaboration" },
      { title: "Migration from Git", href: "/docs/guides/migration" },
      { title: "Backup & Recovery", href: "/docs/guides/backup-recovery" },
      { title: "FAQ", href: "/docs/guides/faq" },
      { title: "Glossary", href: "/docs/guides/glossary" },
    ],
  },
  {
    title: "API & Integration",
    href: "/docs/api/rest",
    items: [
      { title: "REST API", href: "/docs/api/rest" },
      { title: "Webhooks", href: "/docs/api/webhooks" },
      { title: "Wire Protocol", href: "/docs/api/wire" },
      { title: "SDKs", href: "/docs/api/sdks" },
      { title: "CI/CD Integration", href: "/docs/api/cicd" },
    ],
  },
  {
    title: "Deployment",
    href: "/docs/deployment",
    items: [
      { title: "Deployment", href: "/docs/deployment" },
      { title: "Docker", href: "/docs/deployment/docker" },
      { title: "Kubernetes", href: "/docs/deployment/kubernetes" },
      { title: "Self-Hosting", href: "/docs/deployment/self-hosting" },
      { title: "Cloud Providers", href: "/docs/deployment/cloud" },
    ],
  },
  {
    title: "Architecture",
    href: "/docs/architecture",
    items: [
      { title: "Architecture Overview", href: "/docs/architecture" },
      { title: "Data Structures", href: "/docs/architecture/data-structures" },
      { title: "Algorithms", href: "/docs/architecture/algorithms" },
      { title: "Internals", href: "/docs/architecture/internals" },
      { title: "Testing Framework", href: "/docs/testing" },
      { title: "Benchmarks", href: "/docs/benchmarks" },
      { title: "Network Protocol", href: "/docs/architecture/protocol" },
      { title: "Security", href: "/docs/architecture/security" },
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

interface DocsSidebarProps {
  onNavigate?: () => void;
}

export function DocsSidebar({ onNavigate }: DocsSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto no-scrollbar overflow-x-hidden px-2">
      {/* Gradient blur overlay - top */}
      <div className="from-background via-background/80 to-background/50 sticky -top-1 z-10 h-8 shrink-0 bg-gradient-to-b" />

      {/* Detailed Navigation - Flat sections */}
      {docsNavigation.map((section) => (
        <div key={section.title} className="relative flex w-full min-w-0 flex-col p-2">
          <div className="flex h-8 shrink-0 items-center rounded-md px-2 text-xs text-muted-foreground font-medium">
            {section.title}
          </div>
          <ul className="flex w-full min-w-0 flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  data-active={pathname === item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md p-2 text-left",
                    "transition-[width,height,padding] focus-visible:ring-2",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "data-[active=true]:bg-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
                    "relative h-[30px] w-fit overflow-visible border border-transparent text-[0.8rem] font-medium"
                  )}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Gradient blur overlay - bottom */}
      <div className="from-background via-background/80 to-background/50 sticky -bottom-1 z-10 h-16 shrink-0 bg-gradient-to-t" />
    </div>
  );
}
