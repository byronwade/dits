"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons/github-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AlphaBanner } from "@/components/alpha-banner";
import { SkipLink } from "@/components/skip-link";
import { ProductLauncher } from "@/components/product-launcher";
import { getProduct, PRODUCTS, type NavItem } from "@/lib/products";

function activeIndex(navItems: NavItem[], pathname: string | null): number {
  if (!pathname) return -1;
  return navItems.findIndex(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );
}

/**
 * Desktop nav — a light "surface" dock from byronwade/ui: a bordered, soft-
 * shadowed pill of TEXT links with a single morphing indicator that glides
 * behind the active item (and follows the pointer on hover, returning to the
 * active item on leave). Professional and scannable; the morph is the motion,
 * not an icon dock.
 */
function DockNav({
  navItems,
  active,
}: {
  navItems: NavItem[];
  active: number;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Array<HTMLAnchorElement | null>>([]);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const [indicator, setIndicator] = React.useState<{
    left: number;
    width: number;
    visible: boolean;
  }>({ left: 0, width: 0, visible: false });

  // Position the gliding pill behind a target item (or the active one).
  const moveTo = React.useCallback(
    (index: number) => {
      const list = listRef.current;
      const el = itemRefs.current[index];
      if (!list || !el) {
        setIndicator((i) => ({ ...i, visible: false }));
        return;
      }
      const listBox = list.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      setIndicator({
        left: box.left - listBox.left,
        width: box.width,
        visible: true,
      });
    },
    [],
  );

  const target = hovered ?? active;
  React.useLayoutEffect(() => {
    moveTo(target);
  }, [target, moveTo]);

  // Reposition on resize / font load so the pill never drifts.
  React.useEffect(() => {
    const onResize = () => moveTo(hovered ?? active);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [hovered, active, moveTo]);

  return (
    <nav
      aria-label="Main navigation"
      className="hidden md:flex"
      onMouseLeave={() => setHovered(null)}
    >
      <div
        ref={listRef}
        className="relative flex items-center gap-0.5 rounded-full border border-border bg-card/80 p-1 shadow-card backdrop-blur supports-[backdrop-filter]:bg-card/60"
      >
        {/* Morphing indicator */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-1 rounded-full bg-secondary transition-[left,width,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
            indicator.visible ? "opacity-100" : "opacity-0",
          )}
          style={{ left: indicator.left, width: indicator.width }}
        />
        {navItems.map((item, i) => {
          const isActive = i === active;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              onMouseEnter={() => setHovered(i)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative z-10 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Global site header — refined, professional top bar on byronwade/ui tokens.
 * The top-left pairs the logo with a product launcher ([ Dits | AI ]) so you
 * can switch between the media site and the AI site; the active product drives
 * the centered morphing dock of text links. Theme toggle + primary CTA trail.
 * Mobile collapses to a Sheet. The active product is derived from the path, so
 * this component stays prop-less across both surfaces.
 *
 * AGENTS.md compliance:
 * - MUST: "Skip to content" link
 * - MUST: Full keyboard support (links are <a>; indicator follows focus)
 * - MUST: Hit targets >= 24px (44px on mobile)
 * - MUST: Visible focus rings on every interactive element
 * - MUST: Respects prefers-reduced-motion (indicator transition disabled)
 */
export function Header() {
  const pathname = usePathname();
  const product = getProduct(pathname);
  const navItems = product.nav;
  const active = activeIndex(navItems, pathname);
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Active state for the mobile menu, where both products' items are listed.
  const isItemActive = (href: string) =>
    pathname === href || (pathname?.startsWith(href + "/") ?? false);

  return (
    <>
      {/* AGENTS.md: Skip to content link for keyboard users */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>

      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border/60 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="container grid h-16 grid-cols-[1fr_auto] items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
          {/* Logo + product launcher. The launcher lives in the bar on desktop
              and moves into the slide-out menu on mobile; the wordmark fills in
              for product context on small screens. */}
          <div className="flex items-center gap-2.5">
            <Link
              href={product.home}
              aria-label={`${product.name} — Go to homepage`}
              className="group flex w-fit items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Image
                src="/dits.png"
                alt="Dits Logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"
                priority
              />
              <span className="text-base font-bold tracking-tight text-foreground md:hidden">
                {product.name}
              </span>
            </Link>
            <div className="hidden md:flex">
              <ProductLauncher />
            </div>
          </div>

          {/* Centered morphing dock (desktop) */}
          <div className="hidden justify-center md:flex">
            <DockNav navItems={navItems} active={active} />
          </div>

          {/* Trailing actions */}
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              render={
                <Link
                  href="https://github.com/byronwade/dits"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View Dits on GitHub (opens in new tab)"
                />
              }
            >
              <GithubIcon className="size-[18px]" />
            </Button>

            <ThemeToggle />

            <Button
              className="hidden gap-1.5 sm:inline-flex"
              render={
                <Link
                  href="https://github.com/byronwade/dits"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <GithubIcon className="size-4" />
              Star on GitHub
            </Button>

            {/* Mobile menu — holds the product switcher and BOTH products'
                navigation, so you can switch product and navigate from one
                place. Controlled so it closes on navigation. */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Open navigation menu"
                  />
                }
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex w-[86vw] max-w-sm flex-col gap-0 overflow-y-auto overscroll-contain px-4 pb-4"
              >
                <SheetHeader className="px-1">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>

                {/* Product switcher (full width) */}
                <div className="mt-2" onClick={() => setMenuOpen(false)}>
                  <ProductLauncher className="w-full" />
                </div>

                <nav
                  className="mt-5 flex flex-1 flex-col"
                  aria-label="Mobile navigation"
                >
                  {PRODUCTS.map((p, idx) => (
                    <div
                      key={p.id}
                      className={cn(
                        idx > 0 && "mt-4 border-t border-border pt-4",
                      )}
                    >
                      <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {p.name}
                      </div>
                      <div className="flex flex-col">
                        {p.nav.map((item) => {
                          const itemActive = isItemActive(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMenuOpen(false)}
                              aria-current={itemActive ? "page" : undefined}
                              className={cn(
                                "flex min-h-[40px] items-center rounded-lg px-3 py-2 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                itemActive
                                  ? "bg-accent text-foreground"
                                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                              )}
                            >
                              {item.title}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <Link
                    href="https://github.com/byronwade/dits"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="mt-6 flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <GithubIcon className="size-4" />
                    Star on GitHub
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <AlphaBanner />
    </>
  );
}
