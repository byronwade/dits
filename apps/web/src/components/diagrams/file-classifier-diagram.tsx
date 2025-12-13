"use client";

import { cn } from "@/lib/utils";
import {
  FileText,
  Video,
  FileCode,
  ArrowDown,
  GitBranch,
  Boxes,
  Layers,
  Filter,
} from "lucide-react";

export function FileClassifierDiagram() {
  return (
    <div className="not-prose my-8 overflow-x-auto">
      <div className="min-w-[500px] space-y-4">
        {/* File Input */}
        <div className="mx-auto max-w-xs">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/10 px-6 py-4 text-center">
            <FileText className="mx-auto h-6 w-6 text-primary" />
            <div className="mt-2 font-bold text-primary">File In</div>
          </div>
        </div>

        <ConnectorArrow />

        {/* Classifier */}
        <div className="mx-auto max-w-xs">
          <div className="rounded-xl border-2 border-dits-500/30 bg-dits-500/10 px-6 py-4 text-center">
            <Filter className="mx-auto h-6 w-6 text-dits-500" />
            <div className="mt-2 font-bold text-dits-600 dark:text-dits-400">
              Classify
            </div>
            <div className="mt-1 text-xs text-muted-foreground">(by type)</div>
          </div>
        </div>

        {/* Branching Lines */}
        <div className="relative flex justify-center py-4">
          <div className="absolute left-1/2 top-0 h-4 w-0.5 -translate-x-1/2 bg-border" />
          <div className="absolute top-4 h-0.5 w-2/3 bg-border" />
          <div className="absolute left-[16.7%] top-4 h-4 w-0.5 bg-border" />
          <div className="absolute left-1/2 top-4 h-4 w-0.5 -translate-x-1/2 bg-border" />
          <div className="absolute right-[16.7%] top-4 h-4 w-0.5 bg-border" />
        </div>

        {/* File Type Cards */}
        <div className="grid grid-cols-3 gap-4">
          <FileTypeCard
            icon={FileText}
            label="Text File"
            examples=".md, .json"
            color="blue"
          />
          <FileTypeCard
            icon={Video}
            label="Binary File"
            examples=".mp4, .mov"
            color="purple"
          />
          <FileTypeCard
            icon={FileCode}
            label="Hybrid"
            examples=".prproj"
            color="amber"
          />
        </div>

        {/* Small Arrows */}
        <div className="grid grid-cols-3 gap-4">
          <ConnectorArrow />
          <ConnectorArrow />
          <ConnectorArrow />
        </div>

        {/* Storage Engines */}
        <div className="grid grid-cols-3 gap-4">
          <StorageEngineCard
            icon={GitBranch}
            label="libgit2"
            features={["Diff", "Merge", "Blame"]}
            color="blue"
          />
          <StorageEngineCard
            icon={Boxes}
            label="FastCDC"
            features={["Chunk", "Dedup", "Delta"]}
            color="purple"
          />
          <StorageEngineCard
            icon={Layers}
            label="Git + CDC"
            features={["combined"]}
            color="amber"
          />
        </div>
      </div>
    </div>
  );
}

function ConnectorArrow({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center py-2", className)}>
      <ArrowDown className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}

function FileTypeCard({
  icon: Icon,
  label,
  examples,
  color,
}: {
  icon: React.ElementType;
  label: string;
  examples: string;
  color: "blue" | "purple" | "amber";
}) {
  const colors = {
    blue: "border-blue-500/30 bg-blue-500/10",
    purple: "border-purple-500/30 bg-purple-500/10",
    amber: "border-amber-500/30 bg-amber-500/10",
  };

  const iconColors = {
    blue: "text-blue-500",
    purple: "text-purple-500",
    amber: "text-amber-500",
  };

  const textColors = {
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    amber: "text-amber-600 dark:text-amber-400",
  };

  return (
    <div
      className={cn(
        "rounded-lg border-2 px-4 py-3 text-center transition-all hover:shadow-md",
        colors[color]
      )}
    >
      <Icon className={cn("mx-auto h-5 w-5", iconColors[color])} />
      <div className={cn("mt-1 font-semibold", textColors[color])}>{label}</div>
      <div className="text-xs text-muted-foreground">({examples})</div>
    </div>
  );
}

function StorageEngineCard({
  icon: Icon,
  label,
  features,
  color,
}: {
  icon: React.ElementType;
  label: string;
  features: string[];
  color: "blue" | "purple" | "amber";
}) {
  const colors = {
    blue: "border-blue-500/30 bg-gradient-to-b from-blue-500/10 to-blue-500/5",
    purple:
      "border-purple-500/30 bg-gradient-to-b from-purple-500/10 to-purple-500/5",
    amber:
      "border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-amber-500/5",
  };

  const iconColors = {
    blue: "text-blue-500",
    purple: "text-purple-500",
    amber: "text-amber-500",
  };

  const textColors = {
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    amber: "text-amber-600 dark:text-amber-400",
  };

  const bulletColors = {
    blue: "before:bg-blue-500",
    purple: "before:bg-purple-500",
    amber: "before:bg-amber-500",
  };

  return (
    <div
      className={cn(
        "rounded-lg border-2 px-4 py-3 text-center transition-all hover:shadow-md",
        colors[color]
      )}
    >
      <Icon className={cn("mx-auto h-5 w-5", iconColors[color])} />
      <div className={cn("mt-1 font-bold", textColors[color])}>{label}</div>
      <div className="mt-2 space-y-1">
        {features.map((feature) => (
          <div
            key={feature}
            className={cn(
              "relative text-xs text-muted-foreground",
              features.length > 1 &&
                `pl-3 text-left before:absolute before:left-0 before:top-1/2 before:h-1 before:w-1 before:-translate-y-1/2 before:rounded-full ${bulletColors[color]}`
            )}
          >
            {feature}
          </div>
        ))}
      </div>
    </div>
  );
}

// Compact version of the File Classifier for inline use
export function FileClassifierCompact() {
  return (
    <div className="not-prose my-6 rounded-xl border-2 border-border bg-gradient-to-r from-muted/50 to-muted/30 p-6">
      <div className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
        File Classifier
      </div>
      <div className="grid grid-cols-3 gap-6 text-center text-sm">
        <div>
          <div className="font-mono text-xs text-muted-foreground">
            .txt, .md, .json, .rs, .py
          </div>
          <div className="my-2 text-lg">→</div>
          <div className="rounded bg-blue-500/10 px-2 py-1 font-medium text-blue-600 dark:text-blue-400">
            libgit2 (Git storage)
          </div>
        </div>
        <div>
          <div className="font-mono text-xs text-muted-foreground">
            .mp4, .mov, .psd, .blend
          </div>
          <div className="my-2 text-lg">→</div>
          <div className="rounded bg-purple-500/10 px-2 py-1 font-medium text-purple-600 dark:text-purple-400">
            Dits CDC (Chunk storage)
          </div>
        </div>
        <div>
          <div className="font-mono text-xs text-muted-foreground">
            .prproj, .aep, .drp
          </div>
          <div className="my-2 text-lg">→</div>
          <div className="rounded bg-amber-500/10 px-2 py-1 font-medium text-amber-600 dark:text-amber-400">
            Hybrid (Git + CDC)
          </div>
        </div>
      </div>
    </div>
  );
}
