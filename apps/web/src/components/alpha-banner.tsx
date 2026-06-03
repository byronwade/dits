"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * AlphaBanner component following AGENTS.md guidelines:
 * - MUST: Use polite aria-live for toasts/inline validation
 * - MUST: Hit target >= 24px (44px on mobile)
 * - MUST: Visible focus rings
 * - MUST: Icon-only buttons have descriptive aria-label
 */
export function AlphaBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const dismissed = localStorage.getItem("dits-alpha-banner-dismissed");
    if (dismissed) {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("dits-alpha-banner-dismissed", "true");
  };

  // Don't render during SSR to avoid hydration mismatch
  if (!hasMounted || !isVisible) {
    return null;
  }

  return (
    // AGENTS.md: role="alert" with aria-live="polite" for screen reader announcements
    <div
      className="fixed top-16 left-0 right-0 z-40 bg-warning/10 border-b border-warning/20 backdrop-blur-sm"
      role="alert"
      aria-live="polite"
    >
      <div className="container flex items-center justify-between gap-4 py-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-foreground">
          {/* AGENTS.md: Decorative icons are aria-hidden */}
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" aria-hidden="true" />
          <p>
            <strong>Alpha Software:</strong>{" "}
            <span className="hidden sm:inline">
              Dits is in early development by a single developer. Not recommended for production use&nbsp;&mdash; may cause data corruption.
            </span>
            <span className="sm:hidden">
              Early development. Not for production use.
            </span>
          </p>
        </div>
        {/* AGENTS.md: min-h/w for touch targets, visible focus, aria-label for icon button */}
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-warning/20 transition-colors flex-shrink-0 min-h-[24px] min-w-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2"
          aria-label="Dismiss alpha software warning banner"
          type="button"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
