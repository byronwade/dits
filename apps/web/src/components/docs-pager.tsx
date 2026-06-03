"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { docsNavigation, type DocLink } from "@/components/docs-sidebar";
import { cn } from "@/lib/utils";

/**
 * Flatten the docs navigation into a single ordered list of pages,
 * de-duplicating repeated hrefs (section landing pages can appear both
 * as a section `href` and as the first item). Single source of truth:
 * the array lives in docs-sidebar.tsx and is imported here.
 */
export function flattenDocsNav(): DocLink[] {
  const flat: DocLink[] = [];
  const seen = new Set<string>();

  for (const section of docsNavigation) {
    for (const item of section.items) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      flat.push(item);
    }
  }

  return flat;
}

function PagerCard({
  item,
  direction,
}: {
  item: DocLink;
  direction: "prev" | "next";
}) {
  const isNext = direction === "next";
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex w-full flex-col gap-1 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50",
        isNext && "items-end text-right"
      )}
    >
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {!isNext && <ChevronLeft className="size-3.5" />}
        {isNext ? "Next" : "Previous"}
        {isNext && <ChevronRight className="size-3.5" />}
      </span>
      <span className="font-medium text-foreground transition-colors group-hover:text-brand">
        {item.title}
      </span>
    </Link>
  );
}

export function DocsPager() {
  const pathname = usePathname();
  const pages = flattenDocsNav();
  const index = pages.findIndex((p) => p.href === pathname);

  // Unknown route — render nothing rather than a broken pager.
  if (index === -1) return null;

  const prev = index > 0 ? pages[index - 1] : null;
  const next = index < pages.length - 1 ? pages[index + 1] : null;

  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 grid grid-cols-2 gap-4 border-t border-border pt-8"
    >
      {prev ? <PagerCard item={prev} direction="prev" /> : <div aria-hidden />}
      {next ? <PagerCard item={next} direction="next" /> : <div aria-hidden />}
    </nav>
  );
}
