import { MetadataRoute } from "next";

/**
 * Dynamic sitemap generation that discovers all pages
 * Next.js will call this function to generate sitemap.xml
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://dits.dev";

  // Keep this list limited to current, reviewed pages. Design archives and
  // redirect-only routes are intentionally excluded.
  const routes = [
    { path: "", priority: 1.0, changefreq: "weekly" },
    { path: "/docs", priority: 0.9, changefreq: "weekly" },
    { path: "/how-it-works", priority: 0.8, changefreq: "monthly" },
    { path: "/benchmarks", priority: 0.8, changefreq: "monthly" },
    { path: "/download", priority: 0.8, changefreq: "weekly" },
    { path: "/playground", priority: 0.6, changefreq: "monthly" },
    { path: "/faq", priority: 0.6, changefreq: "monthly" },
    { path: "/about", priority: 0.7, changefreq: "monthly" },
    { path: "/community", priority: 0.6, changefreq: "monthly" },
    { path: "/contact", priority: 0.4, changefreq: "yearly" },
    { path: "/privacy", priority: 0.3, changefreq: "yearly" },
    { path: "/license", priority: 0.3, changefreq: "yearly" },

    { path: "/docs/getting-started", priority: 0.9, changefreq: "monthly" },
    { path: "/docs/installation", priority: 0.8, changefreq: "monthly" },
    { path: "/docs/why-dits", priority: 0.7, changefreq: "monthly" },
    { path: "/docs/roadmap", priority: 0.7, changefreq: "monthly" },

    { path: "/docs/concepts", priority: 0.7, changefreq: "monthly" },
    { path: "/docs/cli-reference", priority: 0.7, changefreq: "monthly" },
    { path: "/docs/cli/remotes", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/advanced/encryption", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/troubleshooting", priority: 0.7, changefreq: "monthly" },
    { path: "/docs/architecture", priority: 0.7, changefreq: "monthly" },
    { path: "/docs/architecture/security", priority: 0.6, changefreq: "monthly" },
    { path: "/docs/testing", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/contributing", priority: 0.5, changefreq: "monthly" },
    { path: "/docs/development", priority: 0.4, changefreq: "monthly" },
    { path: "/docs/code-of-conduct", priority: 0.3, changefreq: "yearly" },

    // Public research notes: these are indexed as research, not as a product.
    { path: "/ai", priority: 0.4, changefreq: "monthly" },
    { path: "/ai/how-it-works", priority: 0.3, changefreq: "monthly" },
    { path: "/ai/benchmarks", priority: 0.3, changefreq: "monthly" },
    { path: "/ai/docs", priority: 0.3, changefreq: "monthly" },
    { path: "/ai/faq", priority: 0.3, changefreq: "monthly" },
    { path: "/ai/about", priority: 0.3, changefreq: "monthly" },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    changeFrequency: route.changefreq as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: route.priority,
  }));
}
