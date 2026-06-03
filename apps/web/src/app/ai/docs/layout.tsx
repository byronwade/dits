import { DocsShell } from "@/components/docs-shell";

/**
 * AI docs layout. Uses the same shared chrome as the media docs; the indigo
 * `.theme-ai` accent is supplied by the parent `app/ai/layout.tsx` wrapper, and
 * the sidebar/pager pick the AI docs tree from the path automatically.
 */
export default function AiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DocsShell label="Dits for AI docs">{children}</DocsShell>;
}
