import { DocsShell } from "@/components/docs-shell";
import { Callout } from "@/components/ui/callout";

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
  return (
    <DocsShell label="Dits for AI research notes">
      <Callout type="warning" title="Research, not a shipped AI product" className="mb-6">
        These pages explore possible model and dataset applications of the generic
        Dits engine. AI-specific formats, workflows, remote sync, similarity
        layers, and recompute orchestration are not implemented.
      </Callout>
      {children}
    </DocsShell>
  );
}
