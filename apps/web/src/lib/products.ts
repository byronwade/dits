/**
 * Product registry — Dits presents one shipping alpha and one research lens:
 *
 *   • "media" — the creative product (video, photos, large files) at `/`
 *   • "ai"    — a research lens for model, dataset, and research artifacts
 *
 * The header, footer, and launcher all read from this single source so the two
 * sections stay structurally identical while differing in copy, nav, and accent.
 * Detection is path-based (`getProduct`), so shared components stay prop-less.
 */

import {
  docsNavigation,
  aiDocsNavigation,
  flattenDocsNav,
} from "@/lib/docs-nav";

export type NavItem = { title: string; href: string };

export type Product = {
  id: "media" | "ai";
  /** Full wordmark, e.g. "Dits for AI". */
  name: string;
  /** Short label shown in the launcher segment. */
  label: string;
  /** One-line descriptor used in the launcher / footer. */
  tagline: string;
  /** Home route for this product. */
  home: string;
  /** Centered dock navigation. */
  nav: NavItem[];
  /** Footer link columns. */
  footer: {
    documentation: NavItem[];
    resources: NavItem[];
  };
};

export const PRODUCTS: Product[] = [
  {
    id: "media",
    name: "Dits",
    label: "Media",
    tagline: "Media & Asset Pipelines",
    home: "/",
    nav: [
      { title: "Docs", href: "/docs" },
      { title: "How it works", href: "/how-it-works" },
      { title: "Benchmarks", href: "/benchmarks" },
      { title: "FAQ", href: "/faq" },
      { title: "About", href: "/about" },
      { title: "Community", href: "/community" },
    ],
    footer: {
      documentation: [
        { title: "Getting Started", href: "/docs/getting-started" },
        { title: "CLI Reference", href: "/docs/cli-reference" },
        { title: "Core Concepts", href: "/docs/concepts" },
        { title: "Configuration", href: "/docs/configuration" },
      ],
      resources: [
        { title: "Download", href: "/download" },
        { title: "How it works", href: "/how-it-works" },
        { title: "Playground", href: "/playground" },
        { title: "About", href: "/about" },
        { title: "Community", href: "/community" },
      ],
    },
  },
  {
    id: "ai",
    name: "Dits for AI research",
    label: "AI research",
    tagline: "Future model and dataset workflows",
    home: "/ai",
    nav: [
      { title: "How it works", href: "/ai/how-it-works" },
      { title: "Benchmarks", href: "/ai/benchmarks" },
      { title: "Docs", href: "/ai/docs" },
      { title: "FAQ", href: "/ai/faq" },
      { title: "About", href: "/ai/about" },
    ],
    footer: {
      documentation: [
        { title: "Overview", href: "/ai/docs" },
        { title: "How it works", href: "/ai/how-it-works" },
        { title: "Benchmarks", href: "/ai/benchmarks" },
        { title: "About", href: "/ai/about" },
      ],
      resources: [
        { title: "Dits for media", href: "/" },
        { title: "How it works", href: "/ai/how-it-works" },
        { title: "Benchmarks", href: "/ai/benchmarks" },
        { title: "About", href: "/ai/about" },
      ],
    },
  },
];

export const MEDIA_PRODUCT = PRODUCTS[0];
export const AI_PRODUCT = PRODUCTS[1];

/** Resolve the active product from a pathname. `/ai` and `/ai/*` are the AI surface. */
export function getProduct(pathname: string | null): Product {
  if (pathname === "/ai" || (pathname?.startsWith("/ai/") ?? false)) {
    return AI_PRODUCT;
  }
  return MEDIA_PRODUCT;
}

// ---------------------------------------------------------------------------
// Cross-product navigation (the launcher's "take me to the same page" toggle)
// ---------------------------------------------------------------------------

/** Top-level (non-docs) marketing routes that exist per surface. */
const MEDIA_TOP_ROUTES = [
  "/",
  "/how-it-works",
  "/benchmarks",
  "/playground",
  "/faq",
  "/about",
  "/community",
  "/download",
  "/docs",
];
const AI_TOP_ROUTES = ["/ai", "/ai/how-it-works", "/ai/benchmarks", "/ai/about", "/ai/docs", "/ai/faq"];

/** Full set of known routes per product, used for existence checks on toggle. */
const MEDIA_ROUTES = new Set<string>([
  ...MEDIA_TOP_ROUTES,
  ...flattenDocsNav(docsNavigation).map((l) => l.href),
]);
const AI_ROUTES = new Set<string>([
  ...AI_TOP_ROUTES,
  // AI docs nav can link out to media (e.g. "/docs"); keep only AI-owned routes.
  ...flattenDocsNav(aiDocsNavigation)
    .map((l) => l.href)
    .filter((h) => h === "/ai" || h.startsWith("/ai/")),
]);

/**
 * Explicit cross-product equivalences for shared topics whose slugs DON'T match
 * (so prefix-swap alone wouldn't find them). Each pair is bidirectional. Pages
 * that already share a slug (e.g. /docs/installation ⇄ /ai/docs/installation)
 * need no entry — the prefix swap handles them.
 */
const CROSS_ALIASES: Array<[media: string, ai: string]> = [
  ["/docs/cli-reference", "/ai/docs/cli"], // CLI landing pages
  ["/docs/concepts", "/ai/docs/concepts/addressing"], // concepts overview
];
const MEDIA_TO_AI = new Map(CROSS_ALIASES.map(([m, a]) => [m, a]));
const AI_TO_MEDIA = new Map(CROSS_ALIASES.map(([m, a]) => [a, m]));

function toMediaCandidate(pathname: string): string {
  if (pathname === "/ai") return "/";
  if (pathname.startsWith("/ai/")) return pathname.slice(3); // "/ai/docs" -> "/docs"
  return pathname;
}

function toAiCandidate(pathname: string): string {
  if (pathname === "/") return "/ai";
  return "/ai" + pathname; // "/docs/x" -> "/ai/docs/x"
}

/**
 * Resolve `candidate` against a product's known routes, walking up path
 * ancestors until a real route is found, then falling back to `home`.
 * e.g. "/ai/docs/cli/files" (no mirror) → "/ai/docs/cli" → "/ai/docs" ✓
 */
function resolveExisting(candidate: string, routes: Set<string>, home: string): string {
  let p = candidate;
  while (p && p !== "/" && p !== "/ai") {
    if (routes.has(p)) return p;
    const i = p.lastIndexOf("/");
    p = i > 0 ? p.slice(0, i) : home;
  }
  return routes.has(p) ? p : home;
}

/**
 * Given the current path and a target product, return the path the launcher
 * should navigate to — the *equivalent* page on the other surface when it
 * exists, otherwise the nearest shared ancestor, otherwise the product home.
 * Switching to the product you're already on is a no-op (stay put).
 */
export function counterpartPath(pathname: string | null, targetId: Product["id"]): string {
  const current = getProduct(pathname).id;
  const path = pathname ?? "/";
  if (current === targetId) return path;

  if (targetId === "ai") {
    return (
      MEDIA_TO_AI.get(path) ??
      resolveExisting(toAiCandidate(path), AI_ROUTES, AI_PRODUCT.home)
    );
  }
  return (
    AI_TO_MEDIA.get(path) ??
    resolveExisting(toMediaCandidate(path), MEDIA_ROUTES, MEDIA_PRODUCT.home)
  );
}
