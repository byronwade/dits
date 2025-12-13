"use client";

import { cn } from "@/lib/utils";
import {
  Terminal,
  Monitor,
  Code2,
  HardDrive,
  Plug,
  Layers,
  Server,
  Database,
  Cloud,
  ArrowDown,
} from "lucide-react";

interface DiagramBoxProps {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "accent";
}

function DiagramBox({ children, className, variant = "primary" }: DiagramBoxProps) {
  const variants = {
    primary: "bg-primary/10 border-primary/30 text-primary",
    secondary: "bg-muted border-border text-foreground",
    accent: "bg-accent/10 border-accent/30 text-accent-foreground",
  };

  return (
    <div
      className={cn(
        "rounded-lg border-2 px-4 py-3 text-center font-medium transition-colors",
        variants[variant],
        className
      )}
    >
      {children}
    </div>
  );
}

function ConnectorLine({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center", className)}>
      <div className="h-8 w-0.5 bg-border" />
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

export function ArchitectureDiagram() {
  return (
    <div className="not-prose my-8 overflow-x-auto">
      <div className="min-w-[600px] space-y-4">
        {/* Client Layer */}
        <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-4">
          <div className="mb-3 text-center text-sm font-bold uppercase tracking-wider text-primary">
            Client Layer
          </div>
          <div className="grid grid-cols-5 gap-3">
            <ClientBox icon={Terminal} label="CLI" tech="clap" />
            <ClientBox icon={Monitor} label="GUI" tech="Tauri" />
            <ClientBox icon={Code2} label="SDK" tech="Rust" />
            <ClientBox icon={HardDrive} label="VFS" tech="FUSE" />
            <ClientBox icon={Plug} label="NLE Plugins" tech="Premiere/Resolve" />
          </div>
        </div>

        <ConnectorArrow />

        {/* Core Engine */}
        <div className="mx-auto max-w-md">
          <div className="rounded-xl border-2 border-dits-500/30 bg-gradient-to-b from-dits-500/10 to-transparent p-4">
            <div className="mb-3 flex items-center justify-center gap-2">
              <Layers className="h-5 w-5 text-dits-500" />
              <span className="font-bold text-dits-600 dark:text-dits-400">Core Engine</span>
            </div>
            <div className="space-y-2 text-sm">
              <EngineFeature>Hybrid Storage (libgit2 + FastCDC)</EngineFeature>
              <EngineFeature>BLAKE3 Hashing</EngineFeature>
              <EngineFeature>ISOBMFF Parsing</EngineFeature>
              <EngineFeature>Manifest Management</EngineFeature>
              <EngineFeature>Conflict Resolution</EngineFeature>
            </div>
          </div>
        </div>

        <ConnectorArrow />

        {/* Transport Layer */}
        <div className="mx-auto max-w-md">
          <div className="rounded-xl border-2 border-green-500/30 bg-gradient-to-b from-green-500/10 to-transparent p-4">
            <div className="mb-3 flex items-center justify-center gap-2">
              <Server className="h-5 w-5 text-green-500" />
              <span className="font-bold text-green-600 dark:text-green-400">Transport Layer</span>
            </div>
            <div className="space-y-2 text-sm">
              <EngineFeature color="green">QUIC (quinn)</EngineFeature>
              <EngineFeature color="green">Delta Sync</EngineFeature>
              <EngineFeature color="green">Bandwidth Estimation</EngineFeature>
              <EngineFeature color="green">Resume/Retry</EngineFeature>
            </div>
          </div>
        </div>

        <ConnectorArrow />

        {/* Storage Backends */}
        <div className="grid grid-cols-3 gap-4">
          <StorageBox
            icon={HardDrive}
            label="LOCAL"
            sublabel=".dits/"
            color="amber"
          />
          <div className="space-y-2">
            <StorageBox
              icon={Server}
              label="SERVER"
              sublabel="Axum"
              color="purple"
            />
            <ConnectorLine />
            <div className="rounded-lg border-2 border-purple-500/30 bg-purple-500/10 px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Database className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                  PostgreSQL + Redis
                </span>
              </div>
            </div>
          </div>
          <StorageBox
            icon={Cloud}
            label="STORAGE"
            sublabel="S3"
            color="sky"
          />
        </div>
      </div>
    </div>
  );
}

function ClientBox({
  icon: Icon,
  label,
  tech,
}: {
  icon: React.ElementType;
  label: string;
  tech: string;
}) {
  return (
    <div className="rounded-lg border border-primary/20 bg-card p-3 text-center shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      <Icon className="mx-auto h-5 w-5 text-primary" />
      <div className="mt-1.5 text-sm font-semibold">{label}</div>
      <div className="text-xs text-muted-foreground">({tech})</div>
    </div>
  );
}

function EngineFeature({
  children,
  color = "dits",
}: {
  children: React.ReactNode;
  color?: "dits" | "green";
}) {
  const colors = {
    dits: "text-dits-600 dark:text-dits-400 before:bg-dits-500",
    green: "text-green-600 dark:text-green-400 before:bg-green-500",
  };

  return (
    <div
      className={cn(
        "relative pl-4 before:absolute before:left-0 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full",
        colors[color]
      )}
    >
      {children}
    </div>
  );
}

function StorageBox({
  icon: Icon,
  label,
  sublabel,
  color,
}: {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  color: "amber" | "purple" | "sky";
}) {
  const colors = {
    amber:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    purple:
      "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  };

  const iconColors = {
    amber: "text-amber-500",
    purple: "text-purple-500",
    sky: "text-sky-500",
  };

  return (
    <div
      className={cn(
        "rounded-lg border-2 px-4 py-3 text-center transition-all hover:shadow-md",
        colors[color]
      )}
    >
      <Icon className={cn("mx-auto h-6 w-6", iconColors[color])} />
      <div className="mt-1 font-bold">{label}</div>
      <div className="text-xs opacity-70">({sublabel})</div>
    </div>
  );
}
