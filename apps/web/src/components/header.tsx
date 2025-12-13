"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Github, Heart, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AlphaBanner } from "@/components/alpha-banner";
import { SkipLink } from "@/components/skip-link";

const navItems = [
  { title: "About", href: "/about" },
  { title: "Docs", href: "/docs" },
  { title: "Download", href: "/download" },
  { title: "Community", href: "/community" },
];

/**
 * Header component following AGENTS.md guidelines:
 * - MUST: Include "Skip to content" link
 * - MUST: Full keyboard support (links use <a>, not divs)
 * - MUST: Hit target >= 24px (44px on mobile for touch)
 * - MUST: Visible focus rings on all interactive elements
 * - SHOULD: Right-clicking nav logo surfaces brand assets (future enhancement)
 */
export function Header() {
  const pathname = usePathname();

  return (
    <>
      {/* AGENTS.md: Skip to content link for keyboard users */}
      <SkipLink />
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            {/* AGENTS.md: Links are links - using <a>/<Link> for navigation */}
            <Link
              href="/"
              className="mr-6 flex items-center space-x-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Dits - Go to homepage"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="font-bold text-primary-foreground">D</span>
              </div>
              <span className="font-bold">Dits</span>
            </Link>
            {/* AGENTS.md: Semantic nav element for navigation */}
            <nav
              className="hidden md:flex items-center space-x-1 text-sm font-medium"
              aria-label="Main navigation"
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    // AGENTS.md: min-h for adequate hit target, visible focus
                    "px-3 py-2 rounded-md transition-colors hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    pathname === item.href || pathname?.startsWith(item.href + "/")
                      ? "text-foreground bg-accent/50"
                      : "text-foreground/60"
                  )}
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center space-x-1" aria-label="Secondary navigation">
              <Button variant="ghost" size="icon" asChild>
                <Link
                  href="https://github.com/byronwade/dits"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View Dits on GitHub (opens in new tab)"
                >
                  <Github className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="hidden sm:inline-flex gap-1.5 text-pink-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/20"
              >
                <Link
                  href="https://github.com/sponsors/byronwade"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Sponsor Dits on GitHub (opens in new tab)"
                >
                  <Heart className="h-4 w-4" aria-hidden="true" />
                  <span>Sponsor</span>
                </Link>
              </Button>
              <ThemeToggle />
              <Button asChild className="hidden sm:inline-flex">
                <Link href="/download">Download</Link>
              </Button>
              {/* Mobile menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                {/* AGENTS.md: overscroll-behavior: contain in modals/drawers */}
                <SheetContent side="right" className="overscroll-contain">
                  <SheetHeader>
                    <SheetTitle>Navigation</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col space-y-2 mt-4" aria-label="Mobile navigation">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          // AGENTS.md: min-h-[44px] for touch targets on mobile
                          "text-lg font-medium transition-colors hover:text-foreground hover:bg-accent px-3 py-3 rounded-md min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          pathname === item.href
                            ? "text-foreground bg-accent/50"
                            : "text-foreground/60"
                        )}
                        aria-current={pathname === item.href ? "page" : undefined}
                      >
                        {item.title}
                      </Link>
                    ))}
                    <Link
                      href="https://github.com/sponsors/byronwade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-lg font-medium text-pink-500 hover:text-pink-600 px-3 py-3 rounded-md min-h-[44px] hover:bg-pink-50 dark:hover:bg-pink-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Sponsor Dits on GitHub (opens in new tab)"
                    >
                      <Heart className="h-5 w-5" aria-hidden="true" />
                      Sponsor
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>
            </nav>
          </div>
        </div>
      </header>
      <AlphaBanner />
    </>
  );
}
