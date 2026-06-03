import * as React from "react";
import {
  Info,
  Lightbulb,
  TriangleAlert,
  CircleAlert,
  type LucideIcon,
} from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type CalloutType = "note" | "tip" | "warning" | "important";

interface CalloutConfig {
  icon: LucideIcon;
  label: string;
  /** Tone classes applied to the Alert wrapper (semantic tokens only). */
  className: string;
}

const calloutConfig: Record<CalloutType, CalloutConfig> = {
  note: {
    icon: Info,
    label: "Note",
    className: "border-l-2 border-l-info bg-info/5 text-info",
  },
  tip: {
    icon: Lightbulb,
    label: "Tip",
    className: "border-l-2 border-l-brand bg-brand/5 text-brand",
  },
  warning: {
    icon: TriangleAlert,
    label: "Warning",
    className: "border-l-2 border-l-warning bg-warning/5 text-warning",
  },
  important: {
    icon: CircleAlert,
    label: "Important",
    className: "border-l-2 border-l-destructive bg-destructive/5 text-destructive",
  },
};

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Callout({
  type = "note",
  title,
  children,
  className,
}: CalloutProps) {
  const { icon: Icon, label, className: toneClassName } = calloutConfig[type];

  return (
    <Alert className={cn(toneClassName, className)}>
      {/* Icon must be a direct child so Alert's grid layout engages. */}
      <Icon />
      <AlertTitle>{title ?? label}</AlertTitle>
      <AlertDescription className="text-foreground/80">
        {children}
      </AlertDescription>
    </Alert>
  );
}
