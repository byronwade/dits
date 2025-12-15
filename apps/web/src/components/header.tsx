"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Github, Heart, Menu, Sparkles } from "lucide-react";
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
  { title: "Docs", href: "/docs" },
  { title: "About", href: "/about" },
  { title: "Community", href: "/community" },
];

// Chunk positions - carefully placed for visual balance
const chunkPositions = [
  { top: "15%", left: "5%" },
  { top: "60%", left: "12%" },
  { top: "25%", left: "25%" },
  { top: "70%", left: "38%" },
  { top: "20%", left: "55%" },
  { top: "65%", left: "68%" },
  { top: "30%", left: "82%" },
  { top: "55%", left: "92%" },
];

/**
 * Header component - "Chunk Flow" design
 * 
 * Visual storytelling through animated floating chunks that represent
 * Dits' core innovation: intelligent file chunking for version control.
 * 
 * Features:
 * - Glassmorphism container with backdrop blur
 * - Animated gradient bottom border
 * - Floating chunk particles in background
 * - Nav links with chunk-style hover indicators
 * - Logo with subtle pulse on hover
 * 
 * AGENTS.md compliance:
 * - MUST: Include "Skip to content" link
 * - MUST: Full keyboard support (links use <a>, not divs)
 * - MUST: Hit target >= 24px (44px on mobile for touch)
 * - MUST: Visible focus rings on all interactive elements
 * - MUST: Respects prefers-reduced-motion
 */
export function Header() {
  const pathname = usePathname();

  return (
    <>
      {/* AGENTS.md: Skip to content link for keyboard users */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <header className="fixed top-0 left-0 right-0 z-50 w-full header-glass header-gradient-border">
        {/* Floating chunk particles - visual representation of file chunks */}
        <div className="header-chunks" aria-hidden="true">
          {chunkPositions.map((pos, i) => (
            <div
              key={i}
              className="header-chunk"
              style={{ top: pos.top, left: pos.left }}
            />
          ))}
        </div>

        <div className="container relative z-10 flex h-16 items-center">
          <div className="mr-4 flex">
            {/* Logo with pulse animation on hover */}
            <Link
              href="/"
              className="header-logo mr-6 flex items-center space-x-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group"
              aria-label="Dits - Go to homepage"
            >
              <div className="header-logo-icon relative">
                <Image
                  src="/dits.png"
                  alt="Dits Logo"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                  priority
                />
                {/* Subtle glow effect behind logo */}
                <div className="absolute inset-0 -z-10 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-bold text-lg tracking-tight">Dits</span>
            </Link>

            {/* Main navigation with chunk-style indicators */}
            <nav
              className="hidden md:flex items-center space-x-1 text-sm font-medium"
              aria-label="Main navigation"
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "nav-link-chunk px-4 py-2 rounded-md transition-colors hover:text-foreground hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    pathname === item.href || pathname?.startsWith(item.href + "/")
                      ? "text-foreground"
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
              {/* GitHub link */}
              <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-foreground" asChild>
                <Link
                  href="https://github.com/byronwade/dits"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View Dits on GitHub (opens in new tab)"
                >
                  <Github className="h-[18px] w-[18px]" aria-hidden="true" />
                </Link>
              </Button>

              {/* Sponsor button - with gradient on hover */}
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="hidden sm:inline-flex gap-1.5 text-pink-500 hover:text-pink-600 hover:bg-pink-500/10"
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

              {/* Primary CTA - GitHub for open source project in development */}
              <Button
                asChild
                className="hidden sm:inline-flex gap-1.5 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 shadow-sm"
              >
                <Link
                  href="https://github.com/byronwade/dits"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" aria-hidden="true" />
                  Star on GitHub
                </Link>
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
                <SheetContent side="right" className="overscroll-contain">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                      Navigation
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col space-y-2 mt-6" aria-label="Mobile navigation">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "text-lg font-medium transition-colors hover:text-foreground hover:bg-accent px-4 py-3 rounded-lg min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent",
                          pathname === item.href
                            ? "text-foreground bg-accent/50 border-primary/20"
                            : "text-foreground/60"
                        )}
                        aria-current={pathname === item.href ? "page" : undefined}
                      >
                        {item.title}
                      </Link>
                    ))}
                    <div className="pt-4 border-t mt-4">
                      <Link
                        href="https://github.com/sponsors/byronwade"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-lg font-medium text-pink-500 hover:text-pink-600 px-4 py-3 rounded-lg min-h-[44px] hover:bg-pink-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
