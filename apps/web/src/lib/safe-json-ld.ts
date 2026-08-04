/**
 * Serialize JSON-LD for embedding in <script type="application/ld+json">.
 * Escapes `<` so a string value cannot break out of the script element.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
