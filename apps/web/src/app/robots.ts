import { MetadataRoute } from "next";

/**
 * Dynamic robots.txt generation
 * Next.js will call this function to generate robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://dits.byronwade.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
