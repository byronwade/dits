"use client";

import { cn } from "@/lib/utils";
import {
  FileInput,
  Scissors,
  Hash,
  CheckCircle,
  Archive,
  HardDrive,
  FileText,
  ListTree,
  ArrowRight,
  ArrowDown,
} from "lucide-react";

interface FlowStepProps {
  number: number;
  icon: React.ElementType;
  label: string;
  description?: string;
  color?: "primary" | "green" | "amber" | "purple";
}

function FlowStep({
  number,
  icon: Icon,
  label,
  description,
  color = "primary",
}: FlowStepProps) {
  const colors = {
    primary: "border-brand/30 bg-brand/10 text-brand",
    green: "border-chart-2/30 bg-chart-2/10 text-chart-2",
    amber: "border-chart-3/30 bg-chart-3/10 text-chart-3",
    purple:
      "border-chart-4/30 bg-chart-4/10 text-chart-4",
  };

  const numberColors = {
    primary: "bg-primary text-primary-foreground",
    green: "bg-chart-2 text-background",
    amber: "bg-chart-3 text-background",
    purple: "bg-chart-4 text-background",
  };

  const iconColors = {
    primary: "text-brand",
    green: "text-chart-2",
    amber: "text-chart-3",
    purple: "text-chart-4",
  };

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all hover:shadow-md",
        colors[color]
      )}
    >
      <div
        className={cn(
          "absolute -left-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
          numberColors[color]
        )}
      >
        {number}
      </div>
      <Icon className={cn("h-5 w-5 shrink-0", iconColors[color])} />
      <div>
        <div className="font-semibold">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
    </div>
  );
}

function FlowArrow({ direction = "right" }: { direction?: "right" | "down" }) {
  if (direction === "down") {
    return (
      <div className="flex justify-center py-2">
        <ArrowDown className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center px-2">
      <ArrowRight className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}

export function DataFlowDiagram({ variant = "add" }: { variant?: "add" | "push" | "clone" }) {
  if (variant === "add") {
    return <AddFileFlow />;
  }
  if (variant === "push") {
    return <PushChangesFlow />;
  }
  return <CloneRepoFlow />;
}

function AddFileFlow() {
  return (
    <div className="not-prose my-8">
      <div className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Adding a File
      </div>

      {/* Desktop: Horizontal flow */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-center gap-2">
          <FlowStep number={1} icon={FileInput} label="Read" description="From filesystem" />
          <FlowArrow />
          <FlowStep number={2} icon={FileText} label="Parse" description="Container format" color="amber" />
          <FlowArrow />
          <FlowStep number={3} icon={Scissors} label="Chunk" description="FastCDC + keyframes" color="purple" />
          <FlowArrow />
          <FlowStep number={4} icon={Hash} label="Hash" description="BLAKE3" color="green" />
          <FlowArrow />
          <FlowStep number={5} icon={CheckCircle} label="Dedup" description="Check existing" />
        </div>
        <div className="my-4 flex justify-center">
          <ArrowDown className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <FlowStep number={6} icon={Archive} label="Compress" description="New chunks" color="amber" />
          <FlowArrow />
          <FlowStep number={7} icon={HardDrive} label="Store" description=".dits/objects/" color="purple" />
          <FlowArrow />
          <FlowStep number={8} icon={FileText} label="Manifest" description="Create asset" color="green" />
          <FlowArrow />
          <FlowStep number={9} icon={ListTree} label="Stage" description="Update index" />
        </div>
      </div>

      {/* Mobile: Vertical flow */}
      <div className="space-y-3 lg:hidden">
        <FlowStep number={1} icon={FileInput} label="Read file from filesystem" />
        <FlowArrow direction="down" />
        <FlowStep number={2} icon={FileText} label="Parse container format" description="If video file" color="amber" />
        <FlowArrow direction="down" />
        <FlowStep number={3} icon={Scissors} label="Chunk using FastCDC" description="With keyframe alignment" color="purple" />
        <FlowArrow direction="down" />
        <FlowStep number={4} icon={Hash} label="Hash each chunk" description="BLAKE3" color="green" />
        <FlowArrow direction="down" />
        <FlowStep number={5} icon={CheckCircle} label="Check for existing chunks" description="Deduplication" />
        <FlowArrow direction="down" />
        <FlowStep number={6} icon={Archive} label="Compress new chunks" color="amber" />
        <FlowArrow direction="down" />
        <FlowStep number={7} icon={HardDrive} label="Store in .dits/objects/chunks/" color="purple" />
        <FlowArrow direction="down" />
        <FlowStep number={8} icon={FileText} label="Create asset manifest" color="green" />
        <FlowArrow direction="down" />
        <FlowStep number={9} icon={ListTree} label="Update staging index" />
      </div>
    </div>
  );
}

function PushChangesFlow() {
  const steps = [
    { icon: ListTree, label: "Enumerate commits to push" },
    { icon: FileText, label: "Get tree and asset hashes", color: "amber" as const },
    { icon: CheckCircle, label: "Query remote for existing chunks", color: "purple" as const },
    { icon: FileInput, label: "Upload only missing chunks (delta)", color: "green" as const },
    { icon: FileText, label: "Upload manifests and commits", color: "amber" as const },
    { icon: Hash, label: "Update remote references", color: "purple" as const },
  ];

  return (
    <div className="not-prose my-8">
      <div className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Pushing Changes
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i}>
            <FlowStep
              number={i + 1}
              icon={step.icon}
              label={step.label}
              color={step.color}
            />
            {i < steps.length - 1 && <FlowArrow direction="down" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function CloneRepoFlow() {
  const steps = [
    { icon: Hash, label: "Fetch remote refs (branches, tags)" },
    { icon: ListTree, label: "Fetch commit graph", color: "amber" as const },
    { icon: FileText, label: "Fetch tree manifests", color: "purple" as const },
    { icon: FileText, label: "Fetch asset manifests", color: "green" as const },
    { icon: CheckCircle, label: "(Sparse) Mark required chunks" },
    { icon: FileInput, label: "Fetch and verify chunks", color: "amber" as const },
    { icon: HardDrive, label: "Reconstruct working directory", color: "purple" as const },
  ];

  return (
    <div className="not-prose my-8">
      <div className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Cloning a Repository
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i}>
            <FlowStep
              number={i + 1}
              icon={step.icon}
              label={step.label}
              color={step.color}
            />
            {i < steps.length - 1 && <FlowArrow direction="down" />}
          </div>
        ))}
      </div>
    </div>
  );
}
