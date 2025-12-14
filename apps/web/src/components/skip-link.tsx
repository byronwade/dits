"use client";

import { cn } from "@/lib/utils";

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        // Base styles - visually hidden by default
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4",
        // Focus styles for accessibility
        "focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground",
        "focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        // Animation for smooth appearance
        "transition-all duration-200 ease-in-out",
        className
      )}
    >
      {children}
    </a>
  );
}