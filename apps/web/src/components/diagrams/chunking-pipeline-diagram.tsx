"use client";

import { cn } from "@/lib/utils";
import {
  FileVideo,
  Scissors,
  Hash,
  Database,
  ArrowRight,
} from "lucide-react";

export function ChunkingPipelineDiagram() {
  return (
    <div className="not-prose my-8">
      <div className="mb-6 text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Chunking Pipeline
      </div>

      {/* Desktop horizontal view */}
      <div className="hidden md:flex items-center justify-center gap-4">
        <PipelineStage
          icon={FileVideo}
          label="Binary File"
          color="purple"
          size="lg"
        />
        <PipelineArrow />
        <PipelineStage
          icon={Scissors}
          label="FastCDC Chunker"
          color="amber"
        />
        <PipelineArrow />
        <PipelineStage
          icon={Hash}
          label="BLAKE3 Hash"
          color="green"
        />
        <PipelineArrow />
        <PipelineStage
          icon={Database}
          label="Content-Addressable Store"
          color="primary"
          size="lg"
        />
      </div>

      {/* Mobile vertical view */}
      <div className="flex flex-col items-center gap-4 md:hidden">
        <PipelineStage
          icon={FileVideo}
          label="Binary File"
          color="purple"
          size="lg"
        />
        <PipelineArrowVertical />
        <PipelineStage icon={Scissors} label="FastCDC Chunker" color="amber" />
        <PipelineArrowVertical />
        <PipelineStage icon={Hash} label="BLAKE3 Hash" color="green" />
        <PipelineArrowVertical />
        <PipelineStage
          icon={Database}
          label="Content-Addressable Store"
          color="primary"
          size="lg"
        />
      </div>

      {/* Results table */}
      <div className="mt-8 rounded-lg border bg-card">
        <div className="border-b bg-muted/50 px-4 py-2 text-sm font-semibold">
          Deduplication Results
        </div>
        <div className="divide-y">
          <ResultRow
            operation="Move file A→B"
            result="0 bytes"
            explanation="hashes match"
            savings="100%"
          />
          <ResultRow
            operation="Trim video start"
            result="~5% of file"
            explanation="only start chunks change"
            savings="95%"
          />
          <ResultRow
            operation="Append to file"
            result="Size of append only"
            explanation="existing chunks reused"
            savings="varies"
          />
        </div>
      </div>
    </div>
  );
}

function PipelineStage({
  icon: Icon,
  label,
  color,
  size = "md",
}: {
  icon: React.ElementType;
  label: string;
  color: "primary" | "purple" | "amber" | "green";
  size?: "md" | "lg";
}) {
  const colors = {
    primary:
      "border-primary/30 bg-gradient-to-b from-primary/15 to-primary/5 text-primary",
    purple:
      "border-purple-500/30 bg-gradient-to-b from-purple-500/15 to-purple-500/5 text-purple-600 dark:text-purple-400",
    amber:
      "border-amber-500/30 bg-gradient-to-b from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
    green:
      "border-green-500/30 bg-gradient-to-b from-green-500/15 to-green-500/5 text-green-600 dark:text-green-400",
  };

  const iconColors = {
    primary: "text-primary",
    purple: "text-purple-500",
    amber: "text-amber-500",
    green: "text-green-500",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 transition-all hover:shadow-lg",
        colors[color],
        size === "lg" ? "min-w-[140px] px-5 py-4" : "min-w-[120px] px-4 py-3"
      )}
    >
      <Icon
        className={cn(
          iconColors[color],
          size === "lg" ? "h-8 w-8" : "h-6 w-6"
        )}
      />
      <div
        className={cn(
          "mt-2 text-center font-semibold",
          size === "lg" ? "text-sm" : "text-xs"
        )}
      >
        {label}
      </div>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="flex items-center px-1">
      <div className="h-0.5 w-6 bg-gradient-to-r from-border to-muted-foreground/50" />
      <ArrowRight className="h-5 w-5 -ml-1 text-muted-foreground" />
    </div>
  );
}

function PipelineArrowVertical() {
  return (
    <div className="flex flex-col items-center">
      <div className="h-6 w-0.5 bg-gradient-to-b from-border to-muted-foreground/50" />
      <ArrowRight className="h-5 w-5 rotate-90 -mt-1 text-muted-foreground" />
    </div>
  );
}

function ResultRow({
  operation,
  result,
  explanation,
  savings,
}: {
  operation: string;
  result: string;
  explanation: string;
  savings: string;
}) {
  return (
    <div className="grid grid-cols-4 gap-4 px-4 py-3 text-sm">
      <div className="font-medium">{operation}</div>
      <div className="text-primary font-mono">{result}</div>
      <div className="text-muted-foreground">({explanation})</div>
      <div className="text-right">
        <span
          className={cn(
            "rounded px-2 py-0.5 text-xs font-medium",
            savings === "100%"
              ? "bg-green-500/10 text-green-600 dark:text-green-400"
              : savings === "95%"
              ? "bg-green-500/10 text-green-600 dark:text-green-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          )}
        >
          {savings} saved
        </span>
      </div>
    </div>
  );
}
