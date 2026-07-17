import { Construction } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Honesty banner for docs that describe roadmap features.
 *
 * Several capabilities (networked sync, push/pull/fetch to a remote, P2P) are
 * designed or scaffolded but do not work end-to-end. Remote and P2P operations
 * fail nonzero without transfer or repository changes. This callout marks those
 * pages so the docs match what ships today.
 */
export function RoadmapCallout({
  children,
  title = "On the roadmap — not shipped yet",
  className,
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "not-prose my-6 rounded-xl border border-warning/30 bg-warning/5 p-4",
        className
      )}
      role="note"
    >
      <div className="flex items-start gap-3">
        <Construction className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <div className="text-sm text-muted-foreground [&_a]:text-brand [&_a]:underline-offset-2 hover:[&_a]:underline">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
