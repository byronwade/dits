"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDocsNav, flattenDocsNav, type DocLink } from "@/lib/docs-nav";
import { cn } from "@/lib/utils";

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

/**
 * Prev/next pager — product-aware: flattens the active surface's docs nav
 * (`/docs/*` or `/ai/docs/*`) so pagination stays within the correct tree.
 */
export function DocsPager() {
  const pathname = usePathname();
  const pages = flattenDocsNav(getDocsNav(pathname));
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
