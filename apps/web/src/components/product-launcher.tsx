"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { PRODUCTS, getProduct, counterpartPath } from "@/lib/products";

/**
 * Top-left product switcher — a two-segment pill, [ Dits | AI ], that flips
 * between the media site (`/`) and the AI site (`/ai`). A single indicator
 * glides behind the active segment, echoing the header dock's morph language.
 *
 * AGENTS.md compliance:
 * - Segments are real <a> links (keyboard + new-tab friendly), not buttons
 * - aria-current marks the active product; group is labelled for screen readers
 * - Visible focus rings; respects prefers-reduced-motion (indicator only animates
 *   transform, which is disabled under motion-reduce)
 */
export function ProductLauncher({ className }: { className?: string }) {
  const pathname = usePathname();
  const active = getProduct(pathname);
  const activeIndex = PRODUCTS.findIndex((p) => p.id === active.id);

  return (
    <div
      role="group"
      aria-label="Switch product"
      className={cn(
        "relative flex items-center rounded-full border border-border bg-card/80 p-1 shadow-card backdrop-blur supports-[backdrop-filter]:bg-card/60",
        className,
      )}
    >
      {/* Gliding indicator: width is exactly one inner half, translated by its
          own width to land behind the second segment. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-secondary transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {PRODUCTS.map((product) => {
        const isActive = product.id === active.id;
        return (
          <Link
            key={product.id}
            href={counterpartPath(pathname, product.id)}
            aria-current={isActive ? "page" : undefined}
            title={`${product.name} — ${product.tagline}`}
            className={cn(
              "relative z-10 min-w-[3.25rem] flex-1 rounded-full px-3 py-1.5 text-center text-sm font-semibold transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {product.label}
          </Link>
        );
      })}
    </div>
  );
}
