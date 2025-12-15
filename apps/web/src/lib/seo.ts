import { Metadata } from "next";

const SITE_URL = "https://dits.dev";
const SITE_NAME = "Dits";
const DEFAULT_DESCRIPTION =
  "Dits is a free and open source version control system designed for video production and large binary files. Like Git, but optimized for media workflows.";
const DEFAULT_KEYWORDS = [
  "version control",
  "video",
  "large files",
  "binary files",
  "git alternative",
  "media",
  "deduplication",
  "vcs",
  "video production",
  "content-defined chunking",
  "BLAKE3",
  "version control system",
  "git for video",
  "large file version control",
  "media asset management",
  "video workflow",
  "content-addressed storage",
  "distributed version control",
];

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  openGraph?: {
    type?: "website" | "article" | "profile";
    images?: Array<{
      url: string;
      width?: number;
      height?: number;
      alt?: string;
    }>;
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    section?: string;
    tags?: string[];
  };
  twitter?: {
    card?: "summary" | "summary_large_image" | "app" | "player";
    site?: string;
    creator?: string;
  };
  robots?: {
    index?: boolean;
    follow?: boolean;
    noarchive?: boolean;
    nosnippet?: boolean;
    noimageindex?: boolean;
  };
  noindex?: boolean;
}

/**
 * Generate comprehensive metadata for a page with full pSEO support
 */
export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    canonical,
    openGraph,
    twitter,
    robots,
    noindex,
  } = config;

  const fullTitle = title.includes("|") ? title : `${title} | ${SITE_NAME}`;
  const url = canonical || SITE_URL;
  const fullKeywords = [...DEFAULT_KEYWORDS, ...keywords];

  const ogImages = openGraph?.images || [
    {
      url: "/dits.png",
      width: 1200,
      height: 630,
      alt: `${title} - ${SITE_NAME}`,
    },
  ];

  const metadata: Metadata = {
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    keywords: fullKeywords,
    authors: [{ name: "Byron Wade" }],
    creator: "Byron Wade",
    publisher: SITE_NAME,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: openGraph?.type || "website",
      images: ogImages,
      locale: "en_US",
      ...(openGraph?.publishedTime && {
        publishedTime: openGraph.publishedTime,
      }),
      ...(openGraph?.modifiedTime && {
        modifiedTime: openGraph.modifiedTime,
      }),
      ...(openGraph?.authors && {
        authors: openGraph.authors,
      }),
      ...(openGraph?.section && {
        section: openGraph.section,
      }),
      ...(openGraph?.tags && {
        tags: openGraph.tags,
      }),
    },
    twitter: {
      card: twitter?.card || "summary_large_image",
      title: fullTitle,
      description,
      images: ogImages.map((img) => img.url),
      ...(twitter?.site && { site: twitter.site }),
      ...(twitter?.creator && { creator: twitter.creator }),
    },
    robots: {
      index: noindex ? false : robots?.index ?? true,
      follow: robots?.follow ?? true,
      googleBot: {
        index: noindex ? false : robots?.index ?? true,
        follow: robots?.follow ?? true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
        ...(robots?.noarchive && { "noarchive": true }),
        ...(robots?.nosnippet && { "nosnippet": true }),
        ...(robots?.noimageindex && { "noimageindex": true }),
      },
    },
    icons: {
      icon: "/dits.png",
      apple: "/dits.png",
    },
    manifest: "/manifest.json",
  };

  return metadata;
}

/**
 * Generate JSON-LD structured data for SoftwareApplication
 */
export function generateSoftwareApplicationSchema({
  name = SITE_NAME,
  description = DEFAULT_DESCRIPTION,
  applicationCategory = "DeveloperApplication",
  operatingSystem = ["Windows", "macOS", "Linux"],
  offers = {
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating,
}: {
  name?: string;
  description?: string;
  applicationCategory?: string;
  operatingSystem?: string[];
  offers?: {
    price: string;
    priceCurrency: string;
  };
  aggregateRating?: {
    ratingValue: string;
    ratingCount: string;
    bestRating?: string;
    worstRating?: string;
  };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    applicationCategory,
    operatingSystem,
    offers: {
      "@type": "Offer",
      price: offers.price,
      priceCurrency: offers.priceCurrency,
    },
    license: "https://opensource.org/licenses/Apache-2.0",
    ...(aggregateRating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: aggregateRating.ratingValue,
        ratingCount: aggregateRating.ratingCount,
        bestRating: aggregateRating.bestRating || "5",
        worstRating: aggregateRating.worstRating || "1",
      },
    }),
  };
}

/**
 * Generate JSON-LD structured data for Organization
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/dits.png`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [
      "https://github.com/byronwade/dits",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Technical Support",
      url: "https://github.com/byronwade/dits/issues",
    },
  };
}

/**
 * Generate JSON-LD structured data for BreadcrumbList
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * Generate JSON-LD structured data for Article (for documentation pages)
 */
export function generateArticleSchema({
  headline,
  description,
  image,
  datePublished,
  dateModified,
  author = "Byron Wade",
  publisher = SITE_NAME,
  section,
  tags,
}: {
  headline: string;
  description: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  publisher?: string;
  section?: string;
  tags?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    image: image ? (image.startsWith("http") ? image : `${SITE_URL}${image}`) : `${SITE_URL}/dits.png`,
    datePublished: datePublished || new Date().toISOString(),
    dateModified: dateModified || new Date().toISOString(),
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: publisher,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/dits.png`,
      },
    },
    ...(section && { articleSection: section }),
    ...(tags && { keywords: tags.join(", ") }),
  };
}

/**
 * Generate JSON-LD structured data for FAQPage
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate JSON-LD structured data for HowTo (for guides/tutorials)
 */
export function generateHowToSchema({
  name,
  description,
  step,
}: {
  name: string;
  description: string;
  step: Array<{
    name: string;
    text: string;
    url?: string;
    image?: string;
  }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: step.map((s) => ({
      "@type": "HowToStep",
      name: s.name,
      text: s.text,
      ...(s.url && { url: s.url.startsWith("http") ? s.url : `${SITE_URL}${s.url}` }),
      ...(s.image && { image: s.image.startsWith("http") ? s.image : `${SITE_URL}${s.image}` }),
    })),
  };
}

/**
 * Generate JSON-LD structured data for WebPage
 */
export function generateWebPageSchema({
  name,
  description,
  url,
  breadcrumb,
}: {
  name: string;
  description: string;
  url: string;
  breadcrumb?: Array<{ name: string; url: string }>;
}) {
  const fullUrl = url.startsWith("http") ? url : `${SITE_URL}${url}`;
  
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: fullUrl,
    ...(breadcrumb && {
      breadcrumb: generateBreadcrumbSchema(breadcrumb),
    }),
  };
}

/**
 * Generate JSON-LD structured data for WebSite with SearchAction
 */
export function generateWebSiteSchema({
  name = SITE_NAME,
  url = SITE_URL,
  description = DEFAULT_DESCRIPTION,
  potentialAction,
}: {
  name?: string;
  url?: string;
  description?: string;
  potentialAction?: {
    target: string;
    queryInput: string;
  };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    ...(potentialAction && {
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: potentialAction.target,
        },
        "query-input": potentialAction.queryInput,
      },
    }),
  };
}

/**
 * Generate JSON-LD structured data for SoftwareSourceCode
 */
export function generateSoftwareSourceCodeSchema({
  name,
  description,
  codeRepository,
  programmingLanguage,
  runtimePlatform,
  license,
}: {
  name: string;
  description: string;
  codeRepository?: string;
  programmingLanguage?: string | string[];
  runtimePlatform?: string | string[];
  license?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name,
    description,
    ...(codeRepository && { codeRepository }),
    ...(programmingLanguage && {
      programmingLanguage: Array.isArray(programmingLanguage)
        ? programmingLanguage
        : [programmingLanguage],
    }),
    ...(runtimePlatform && {
      runtimePlatform: Array.isArray(runtimePlatform)
        ? runtimePlatform
        : [runtimePlatform],
    }),
    ...(license && { license }),
  };
}

/**
 * Generate JSON-LD structured data for ItemList
 */
export function generateItemListSchema({
  name,
  description,
  items,
}: {
  name: string;
  description?: string;
  items: Array<{
    name: string;
    description?: string;
    url?: string;
    position?: number;
  }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    ...(description && { description }),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: item.position ?? index + 1,
      name: item.name,
      ...(item.description && { description: item.description }),
      ...(item.url && {
        item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
      }),
    })),
  };
}

/**
 * Generate JSON-LD structured data for CollectionPage
 */
export function generateCollectionPageSchema({
  name,
  description,
  url,
  breadcrumb,
  mainEntity,
}: {
  name: string;
  description: string;
  url: string;
  breadcrumb?: Array<{ name: string; url: string }>;
  mainEntity?: {
    "@type": string;
    [key: string]: unknown;
  };
}) {
  const fullUrl = url.startsWith("http") ? url : `${SITE_URL}${url}`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: fullUrl,
    ...(breadcrumb && {
      breadcrumb: generateBreadcrumbSchema(breadcrumb),
    }),
    ...(mainEntity && { mainEntity }),
  };
}

/**
 * Generate JSON-LD structured data for VideoObject
 */
export function generateVideoObjectSchema({
  name,
  description,
  thumbnailUrl,
  uploadDate,
  contentUrl,
  embedUrl,
  duration,
}: {
  name: string;
  description: string;
  thumbnailUrl?: string;
  uploadDate?: string;
  contentUrl?: string;
  embedUrl?: string;
  duration?: string;
}) {
  const fullThumbnailUrl = thumbnailUrl
    ? thumbnailUrl.startsWith("http")
      ? thumbnailUrl
      : `${SITE_URL}${thumbnailUrl}`
    : `${SITE_URL}/dits.png`;

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description,
    thumbnailUrl: fullThumbnailUrl,
    ...(uploadDate && { uploadDate }),
    ...(contentUrl && {
      contentUrl: contentUrl.startsWith("http") ? contentUrl : `${SITE_URL}${contentUrl}`,
    }),
    ...(embedUrl && {
      embedUrl: embedUrl.startsWith("http") ? embedUrl : `${SITE_URL}${embedUrl}`,
    }),
    ...(duration && { duration }),
  };
}

/**
 * Generate JSON-LD structured data for ImageObject
 */
export function generateImageObjectSchema({
  url,
  caption,
  description,
  width,
  height,
}: {
  url: string;
  caption?: string;
  description?: string;
  width?: number;
  height?: number;
}) {
  const fullUrl = url.startsWith("http") ? url : `${SITE_URL}${url}`;

  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    url: fullUrl,
    ...(caption && { caption }),
    ...(description && { description }),
    ...(width && { width }),
    ...(height && { height }),
  };
}
