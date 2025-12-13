"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

interface DocLink {
  title: string;
  href: string;
}

interface DocSection {
  title: string;
  items: DocLink[];
}

const docsNavigation: DocSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Quick Start", href: "/docs/getting-started" },
      { title: "Why Dits vs Git", href: "/docs/why-dits" },
      { title: "Examples & Use Cases", href: "/docs/examples" },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      { title: "How Dits Works", href: "/docs/concepts" },
      { title: "Chunking & Deduplication", href: "/docs/concepts/chunking" },
      { title: "Content Addressing", href: "/docs/concepts/content-addressing" },
      { title: "Repositories", href: "/docs/concepts/repositories" },
      { title: "Commits & History", href: "/docs/concepts/commits" },
      { title: "Branching & Merging", href: "/docs/concepts/branching" },
      { title: "Virtual Filesystem", href: "/docs/concepts/vfs" },
    ],
  },
  {
    title: "CLI Reference",
    items: [
      { title: "Command Overview", href: "/docs/cli-reference" },
      { title: "Repository Commands", href: "/docs/cli/repository" },
      { title: "File Commands", href: "/docs/cli/files" },
      { title: "History Commands", href: "/docs/cli/history" },
      { title: "Branch Commands", href: "/docs/cli/branches" },
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
    ],
  },
  {
    title: "Configuration",
    items: [
      { title: "Config Overview", href: "/docs/configuration" },
      { title: "Repository Config", href: "/docs/configuration/repository" },
      { title: "Global Config", href: "/docs/configuration/global" },
      { title: "Environment Variables", href: "/docs/configuration/env" },
    ],
  },
  {
    title: "Advanced Topics",
    items: [
      { title: "Video Features", href: "/docs/advanced/video" },
      { title: "Proxy Files", href: "/docs/advanced/proxies" },
      { title: "Encryption", href: "/docs/advanced/encryption" },
      { title: "Storage Tiers", href: "/docs/advanced/storage-tiers" },
      { title: "Performance Tuning", href: "/docs/advanced/performance" },
    ],
  },
  {
    title: "API & Integration",
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
    items: [
      { title: "Deployment Overview", href: "/docs/deployment" },
      { title: "Docker", href: "/docs/deployment/docker" },
      { title: "Kubernetes", href: "/docs/deployment/kubernetes" },
      { title: "Self-Hosting", href: "/docs/deployment/self-hosting" },
      { title: "Cloud Providers", href: "/docs/deployment/cloud" },
    ],
  },
  {
    title: "Architecture",
    items: [
      { title: "Overview", href: "/docs/architecture" },
      { title: "Data Structures", href: "/docs/architecture/data-structures" },
      { title: "Algorithms", href: "/docs/architecture/algorithms" },
      { title: "Network Protocol", href: "/docs/architecture/protocol" },
      { title: "Security", href: "/docs/architecture/security" },
    ],
  },
  {
    title: "Community",
    items: [
      { title: "Contributing", href: "/docs/contributing" },
      { title: "Development Setup", href: "/docs/development" },
      { title: "Code of Conduct", href: "/docs/code-of-conduct" },
      { title: "Roadmap", href: "/docs/roadmap" },
      { title: "Troubleshooting", href: "/docs/troubleshooting" },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <ScrollArea className="h-full py-6 pr-6">
      <div className="space-y-4">
        {docsNavigation.map((section) => (
          <Collapsible key={section.title} defaultOpen className="space-y-2">
            <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-semibold">
              {section.title}
              <ChevronRight className="h-4 w-4 transition-transform duration-200 [&[data-state=open]>svg]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-2">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm transition-colors",
                    pathname === item.href
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </ScrollArea>
  );
}
