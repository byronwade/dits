"use client";

/**
 * SkipLink component following AGENTS.md guidelines:
 * - MUST: Include a "Skip to content" link
 * - Hidden by default, visible on focus for keyboard users
 * - Allows keyboard users to skip navigation and go directly to main content
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
    >
      Skip to content
    </a>
  );
}
