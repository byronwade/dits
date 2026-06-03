"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A keynote "chapter": generous vertical rhythm + scroll-reveal.
 * Respects prefers-reduced-motion (no transform/opacity animation when reduced).
 */
export function KeynoteSection({
  chapter,
  tag,
  tagTone = "brand",
  id,
  children,
}: {
  chapter?: string;
  tag?: string;
  tagTone?: "brand" | "amber";
  id?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setShown(true);
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      className="relative border-b border-border py-20 md:py-24"
    >
      {chapter && (
        <span className="absolute right-0 top-6 font-mono text-xs tracking-widest text-muted-foreground/70">
          {chapter}
        </span>
      )}
      <div
        className={cn(
          "transition-all duration-700 ease-out motion-reduce:transition-none",
          shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )}
      >
        {tag && (
          <span
            className={cn(
              "font-mono text-xs font-semibold uppercase tracking-[0.14em]",
              tagTone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-brand"
            )}
          >
            {tag}
          </span>
        )}
        <div className={tag ? "mt-3" : undefined}>{children}</div>
      </div>
    </section>
  );
}
