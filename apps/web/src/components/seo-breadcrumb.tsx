"use client";

import Script from "next/script";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { generateBreadcrumbSchema } from "@/lib/seo";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";

interface BreadcrumbItem {
  name: string;
  url: string;
  current?: boolean;
}

interface SEOBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * SEO-optimized breadcrumb component with structured data
 * Combines visual breadcrumb navigation with JSON-LD schema
 */
export function SEOBreadcrumb({ items, className }: SEOBreadcrumbProps) {
  const schema = generateBreadcrumbSchema(
    items.map((item) => ({
      name: item.name,
      url: item.url,
    }))
  );

  return (
    <>
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(schema),
        }}
      />
      <Breadcrumb className={className}>
        <BreadcrumbList>
          {items.map((item, index) => (
            <div key={item.url} className="flex items-center">
              <BreadcrumbItem>
                {item.current ? (
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    render={
                      <Link
                        href={item.url}
                        prefetch={false}
                        aria-label={item.name}
                      />
                    }
                  >
                    {item.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < items.length - 1 && <BreadcrumbSeparator />}
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}
