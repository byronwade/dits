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
          <div className="rounded-xl border-2 border-brand/30 bg-brand/10 px-6 py-4 text-center">
            <Filter className="mx-auto h-6 w-6 text-brand" />
            <div className="mt-2 font-bold text-brand">
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
    blue: "border-chart-2/30 bg-chart-2/10",
    purple: "border-chart-3/30 bg-chart-3/10",
    amber: "border-chart-4/30 bg-chart-4/10",
  };

  const iconColors = {
    blue: "text-chart-2",
    purple: "text-chart-3",
    amber: "text-chart-4",
  };

  const textColors = {
    blue: "text-chart-2",
    purple: "text-chart-3",
    amber: "text-chart-4",
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
    blue: "border-chart-2/30 bg-gradient-to-b from-chart-2/10 to-chart-2/5",
    purple:
      "border-chart-3/30 bg-gradient-to-b from-chart-3/10 to-chart-3/5",
    amber:
      "border-chart-4/30 bg-gradient-to-b from-chart-4/10 to-chart-4/5",
  };

  const iconColors = {
    blue: "text-chart-2",
    purple: "text-chart-3",
    amber: "text-chart-4",
  };

  const textColors = {
    blue: "text-chart-2",
    purple: "text-chart-3",
    amber: "text-chart-4",
  };

  const bulletColors = {
    blue: "before:bg-chart-2",
    purple: "before:bg-chart-3",
    amber: "before:bg-chart-4",
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
          <div className="rounded bg-chart-2/10 px-2 py-1 font-medium text-chart-2">
            libgit2 (Git storage)
          </div>
        </div>
        <div>
          <div className="font-mono text-xs text-muted-foreground">
            .mp4, .mov, .psd, .blend
          </div>
          <div className="my-2 text-lg">→</div>
          <div className="rounded bg-chart-3/10 px-2 py-1 font-medium text-chart-3">
            Dits CDC (Chunk storage)
          </div>
        </div>
        <div>
          <div className="font-mono text-xs text-muted-foreground">
            .prproj, .aep, .drp
          </div>
          <div className="my-2 text-lg">→</div>
          <div className="rounded bg-chart-4/10 px-2 py-1 font-medium text-chart-4">
            Hybrid (Git + CDC)
          </div>
        </div>
      </div>
    </div>
  );
}
