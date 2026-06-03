"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function DocsToc() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Collect headings (and assign ids) whenever the route changes.
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLHeadingElement>(
        "#doc-content .prose h2, #doc-content .prose h3"
      )
    ).filter((el) => !el.closest(".not-prose"));

    const seen = new Map<string, number>();
    const items: TocItem[] = [];

    for (const el of nodes) {
      const text = el.textContent?.trim() ?? "";
      if (!text) continue;

      let id = el.id;
      if (!id) {
        const base = slugify(text) || "section";
        const count = seen.get(base) ?? 0;
        id = count === 0 ? base : `${base}-${count}`;
        seen.set(base, count + 1);
        el.id = id;
      } else {
        seen.set(id, (seen.get(id) ?? 0) + 1);
      }

      items.push({
        id,
        text,
        level: el.tagName === "H3" ? 3 : 2,
      });
    }

    setHeadings(items);
  }, [pathname]);

  // Scroll-spy via IntersectionObserver.
  useEffect(() => {
    if (headings.length < 2) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        // Bias the active region toward the top of the viewport,
        // clearing the sticky header.
        rootMargin: "-96px 0px -66% 0px",
        threshold: 0,
      }
    );

    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav
      aria-label="On this page"
      className="scrollbar-thin sticky top-24 max-h-[calc(100svh-7rem)] overflow-y-auto py-10"
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ul className="flex flex-col gap-2 border-l border-border">
        {headings.map((heading) => {
          const isActive = activeId === heading.id;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                onClick={() => setActiveId(heading.id)}
                className={cn(
                  "-ml-px block border-l border-transparent py-0.5 text-sm transition-colors",
                  heading.level === 3 ? "pl-6" : "pl-4",
                  isActive
                    ? "border-brand font-medium text-brand"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
