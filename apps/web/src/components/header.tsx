"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Heart, Menu, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { AlphaBanner } from "@/components/alpha-banner";
import { SkipLink } from "@/components/skip-link";

const navItems = [
  { title: "Docs", href: "/docs" },
  { title: "How it works", href: "/how-it-works" },
  { title: "Benchmarks", href: "/benchmarks" },
  { title: "Playground", href: "/playground" },
  { title: "About", href: "/about" },
  { title: "Community", href: "/community" },
];

/**
 * Global site header — clean, on-system top bar built on byronwade/ui tokens.
 *
 * AGENTS.md compliance:
 * - MUST: Include "Skip to content" link
 * - MUST: Full keyboard support (links use <a>, not divs)
 * - MUST: Hit target >= 24px (44px on mobile for touch)
 * - MUST: Visible focus rings on all interactive elements
 * - MUST: Respects prefers-reduced-motion (no motion used here)
 */
export function Header() {
  const pathname = usePathname();

  return (
    <>
      {/* AGENTS.md: Skip to content link for keyboard users */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex">
            {/* Logo wordmark */}
            <Link
              href="/"
              className="mr-6 flex items-center space-x-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group"
              aria-label="Dits - Go to homepage"
            >
              <Image
                src="/dits.png"
                alt="Dits Logo"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
              <span className="font-bold text-lg tracking-tight text-foreground">
                Dits
              </span>
            </Link>

            {/* Main navigation */}
            <nav
              className="hidden md:flex items-center space-x-1 text-sm font-medium"
              aria-label="Main navigation"
            >
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "px-4 py-2 rounded-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive
                        ? "text-brand"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center space-x-1" aria-label="Secondary navigation">
              {/* GitHub link */}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                render={<Link href="https://github.com/byronwade/dits" target="_blank" rel="noopener noreferrer" aria-label="View Dits on GitHub (opens in new tab)" />}
              >
                <GithubIcon className="size-[18px]" />
              </Button>

              {/* Sponsor button */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex gap-1.5 text-muted-foreground hover:text-brand"
                render={<Link href="https://github.com/sponsors/byronwade" target="_blank" rel="noopener noreferrer" aria-label="Sponsor Dits on GitHub (opens in new tab)" />}
              >
                <Heart className="h-4 w-4" aria-hidden="true" />
                <span>Sponsor</span>
              </Button>

              <ThemeToggle />

              {/* Primary CTA */}
              <Button
                className="hidden sm:inline-flex gap-1.5"
                render={<Link href="https://github.com/byronwade/dits" target="_blank" rel="noopener noreferrer" />}
              >
                <GithubIcon className="size-4" />
                Star on GitHub
              </Button>

              {/* Mobile menu */}
              <Sheet>
                <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation menu" />}>
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </SheetTrigger>
                <SheetContent side="right" className="overscroll-contain">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-brand" aria-hidden="true" />
                      Navigation
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col space-y-2 mt-6" aria-label="Mobile navigation">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "text-lg font-medium transition-colors hover:bg-accent px-4 py-3 rounded-lg min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent",
                          pathname === item.href
                            ? "text-brand bg-accent border-border"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        aria-current={pathname === item.href ? "page" : undefined}
                      >
                        {item.title}
                      </Link>
                    ))}
                    <div className="pt-4 border-t border-border mt-4">
                      <Link
                        href="https://github.com/sponsors/byronwade"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-lg font-medium text-muted-foreground hover:text-brand px-4 py-3 rounded-lg min-h-[44px] hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Sponsor Dits on GitHub (opens in new tab)"
                      >
                        <Heart className="h-5 w-5" aria-hidden="true" />
                        Sponsor
                      </Link>
                    </div>
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
