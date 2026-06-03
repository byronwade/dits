"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getDocsNav } from "@/lib/docs-nav";

// Nav data + types now live in lib/docs-nav.ts (a plain module shared by the
// sidebar, pager, and product/route logic). Re-export the types for any
// existing importers.
export type { DocLink, DocSection } from "@/lib/docs-nav";

interface DocsSidebarProps {
  onNavigate?: () => void;
}

/**
 * Product-aware docs sidebar. Renders the media docs tree on `/docs/*` and the
 * "Dits for AI" docs tree on `/ai/docs/*` (chosen by `getDocsNav`). Active-item
 * highlighting uses the indigo `--brand` accent, which the `.theme-ai` wrapper
 * retints automatically on the AI surface.
 */
export function DocsSidebar({ onNavigate }: DocsSidebarProps) {
  const pathname = usePathname();
  const nav = getDocsNav(pathname);

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-auto overflow-x-hidden px-2">
      {/* Gradient blur overlay - top */}
      <div className="from-background via-background/80 to-background/50 sticky -top-1 z-10 h-8 shrink-0 bg-gradient-to-b" />

      {/* Detailed Navigation - Flat sections */}
      {nav.map((section) => (
        <div key={section.title} className="relative flex w-full min-w-0 flex-col p-2">
          <div className="flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {section.title}
          </div>
          <ul className="flex w-full min-w-0 flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  data-active={pathname === item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md p-2 text-left",
                    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "text-muted-foreground hover:bg-accent hover:text-foreground",
                    "data-[active=true]:bg-brand/10 data-[active=true]:font-medium data-[active=true]:text-brand",
                    "relative h-[30px] w-full overflow-visible border border-transparent text-[0.8rem] font-medium"
                  )}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Gradient blur overlay - bottom */}
      <div className="from-background via-background/80 to-background/50 sticky -bottom-1 z-10 h-16 shrink-0 bg-gradient-to-t" />
    </div>
  );
}
