import { cn } from "@/lib/utils";

/**
 * Reusable header for documentation pages.
 *
 * Wrapped in `not-prose` so it can be rendered inside or just before a
 * `.prose` block without prose typography rules fighting its styling.
 */
export function DocPageHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("not-prose mb-8 border-b border-border pb-6", className)}>
      {eyebrow && (
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span
            aria-hidden="true"
            className="inline-block size-1.5 rounded-full bg-brand"
          />
          <span className="text-brand">{eyebrow}</span>
        </div>
      )}
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
