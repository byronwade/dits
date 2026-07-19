# Dits web discovery and sharing

Last reviewed: 2026-07-18.

This file records the implemented search and social-sharing surface. It is not
evidence of ranking, traffic, or rich-result eligibility.

## Canonical surface

- Canonical origin: `https://dits.byronwade.com`
- Source repository: `https://github.com/byronwade/dits`
- `src/app/sitemap.ts` lists the reviewed core product and documentation routes.
- The AI research section is intentionally excluded from the sitemap and marked
  `noindex`; it is not a separate shipped product.
- `src/app/robots.ts` allows the public site, excludes private app namespaces,
  and points crawlers to the sitemap.

## Metadata and structured data

`src/lib/seo.ts` provides shared metadata plus schema helpers for:

- SoftwareApplication;
- Organization;
- WebSite;
- BreadcrumbList;
- Article and FAQPage;
- HowTo and WebPage;
- SoftwareSourceCode, ItemList, and CollectionPage; and
- VideoObject and ImageObject.

Pages use canonical URLs and truthful titles/descriptions. Structured data does
not claim ratings, customers, production readiness, broad format support, or
remote capabilities that do not exist.

## Visual assets

- `/dits-social-preview.png` is the dedicated 1280×640 Open Graph and Twitter card.
- `/icon-192x192.png`, `/icon-512x512.png`, and `/apple-touch-icon.png` are real
  square app icons referenced by metadata and the web manifest.
- `/dits.png` remains the compact in-product logo; it is not declared as a
  1200×630 social image.

## Maintenance checks

When public copy changes:

1. reconcile it with `docs/STATUS.md` and `docs/marketing/positioning.md`;
2. update metadata, sitemap routes, and the social card if the category changes;
3. build the production site and verify every sitemap URL renders;
4. inspect the 1280×640 social image directly;
5. deploy one commit consistently across the canonical domain; and
6. submit the refreshed sitemap through the configured search-console account.

Search engines may retain old snippets after a correct deployment. Never use
stale indexed text as evidence of current product capability.
