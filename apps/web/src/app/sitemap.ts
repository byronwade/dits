import { MetadataRoute } from "next";

/**
 * Dynamic sitemap generation that discovers all pages
 * Next.js will call this function to generate sitemap.xml
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://dits.dev";
  const now = new Date();

  // Define all routes with their priorities and change frequencies
  const routes = [
    // High priority - Main pages
    { path: "", priority: 1.0, changefreq: "weekly" },
    { path: "/docs", priority: 0.9, changefreq: "weekly" },
    { path: "/download", priority: 0.8, changefreq: "weekly" },
    { path: "/about", priority: 0.7, changefreq: "monthly" },
    { path: "/community", priority: 0.6, changefreq: "monthly" },

    // Getting Started & Installation
    { path: "/docs/getting-started", priority: 0.9, changefreq: "monthly" },
    { path: "/docs/installation", priority: 0.8, changefreq: "monthly" },

    // Core Concepts
    { path: "/docs/concepts", priority: 0.7, changefreq: "monthly" },
    { path: "/docs/concepts/content-addressing", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/concepts/chunking", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/concepts/repositories", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/concepts/commits", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/concepts/branching", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/concepts/peer-to-peer", priority: 0.6, changefreq: "monthly" },

    // CLI Reference
    { path: "/docs/cli-reference", priority: 0.7, changefreq: "monthly" },
    { path: "/docs/cli/repository", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/branches", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/files", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/diff", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/history", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/tags", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/stash", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/remotes", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/p2p", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/video", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/vfs", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/storage", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/encryption", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/locks", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/metadata", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/proxies", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/maintenance", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/audit", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/dependencies", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/cli/advanced", priority: 0.5, changefreq: "monthly" },

    // Configuration
    { path: "/docs/configuration", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/configuration/global", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/configuration/repository", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/configuration/env", priority: 0.5, changefreq: "monthly" },

    // Guides
    { path: "/docs/guides/faq", priority: 0.7, changefreq: "monthly" },
    { path: "/docs/guides/troubleshooting", priority: 0.7, changefreq: "monthly" },
    { path: "/docs/guides/collaboration", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/guides/large-files", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/guides/workflows", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/guides/migration", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/guides/backup-recovery", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/guides/hooks", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/guides/ditsignore", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/guides/glossary", priority: 0.5, changefreq: "monthly" },

    // Architecture
    { path: "/docs/architecture", priority: 0.7, changefreq: "monthly" },
    { path: "/docs/architecture/algorithms", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/architecture/data-structures", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/architecture/internals", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/architecture/protocol", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/architecture/security", priority: 0.6, changefreq: "monthly" },

    // Advanced Features
    { path: "/docs/advanced/video", priority: 0.7, changefreq: "monthly" },
    { path: "/docs/advanced/vfs", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/advanced/encryption", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/advanced/performance", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/advanced/proxies", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/advanced/storage-tiers", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/advanced/submodules", priority: 0.5, changefreq: "monthly" },

    // API Documentation
    { path: "/docs/api/rest", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/api/webhooks", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/api/wire", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/api/sdks", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/api/cicd", priority: 0.5, changefreq: "monthly" },

    // Deployment
    { path: "/docs/deployment", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/deployment/docker", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/deployment/kubernetes", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/deployment/cloud", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/deployment/self-hosting", priority: 0.5, changefreq: "monthly" },

    // Additional Pages
    { path: "/docs/why-dits", priority: 0.7, changefreq: "monthly" },
    { path: "/docs/testing", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/benchmarks", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/examples", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/roadmap", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/contributing", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/development", priority: 0.4, changefreq: "monthly" },
    { path: "/docs/code-of-conduct", priority: 0.3, changefreq: "yearly" },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changefreq as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: route.priority,
  }));
}
