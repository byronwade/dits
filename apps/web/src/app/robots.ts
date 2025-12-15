import { MetadataRoute } from "next";

/**
 * Dynamic robots.txt generation
 * Next.js will call this function to generate robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://dits.dev";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/static/",
          "*.json$", // Disallow JSON endpoints
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
        crawlDelay: 0,
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
        crawlDelay: 0,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
